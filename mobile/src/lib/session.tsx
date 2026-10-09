import { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } from "@react-native-google-signin/google-signin";
import Constants from "expo-constants";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, ApiError, onUnauthorized, platform, setApiToken } from "@/lib/api";
import { currentPushToken, forgetPushToken, setBadge } from "@/lib/push";
import type { SessionUser } from "@/lib/types";

const TOKEN_KEY = "kinwhim.session";

type SignInResult = { token: string; user: SessionUser };

type SessionState = {
  status: "loading" | "signedOut" | "signedIn";
  user: SessionUser | null;
  pendingInvite: string | null;
  setPendingInvite: (code: string | null) => void;
  signInWithApple: () => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  startEmail: (email: string) => Promise<void>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  markTermsAccepted: () => void;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const SessionContext = createContext<SessionState | null>(null);

GoogleSignin.configure({
  webClientId: Constants.expoConfig?.extra?.googleWebClientId as string | undefined,
  iosClientId: Constants.expoConfig?.extra?.googleIosClientId as string | undefined,
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionState["status"]>("loading");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [pendingInvite, setPendingInvite] = useState<string | null>(null);

  const clearLocal = useCallback(async () => {
    setApiToken(null);
    forgetPushToken();
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined);
    await setBadge(0);
    setUser(null);
    setStatus("signedOut");
  }, []);

  useEffect(() => {
    onUnauthorized(() => void clearLocal());
    (async () => {
      const token = await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
      if (!token) return setStatus("signedOut");
      setApiToken(token);
      try {
        const me = await api<{ user: SessionUser }>("/api/me");
        setUser(me.user);
        setStatus("signedIn");
      } catch (error) {
        // Offline at launch: keep the session and let screens retry.
        if (error instanceof ApiError && error.code === "offline") {
          setStatus("signedIn");
        } else {
          await clearLocal();
        }
      }
    })();
  }, [clearLocal]);

  const finish = useCallback(async (result: SignInResult) => {
    await SecureStore.setItemAsync(TOKEN_KEY, result.token);
    setApiToken(result.token);
    setUser(result.user);
    setStatus("signedIn");
  }, []);

  const signInWithApple = useCallback(async () => {
    // Apple embeds whatever nonce we give it; we send Apple the hash and the
    // server the raw value, so a stolen token can't be replayed.
    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });
      if (!credential.identityToken) throw new Error("Apple didn’t return a sign-in token.");
      await finish(
        await api<SignInResult>("/api/auth/apple", {
          body: {
            identityToken: credential.identityToken,
            authorizationCode: credential.authorizationCode,
            nonce: rawNonce,
            givenName: credential.fullName?.givenName ?? "",
            familyName: credential.fullName?.familyName ?? "",
            platform,
          },
        }),
      );
      return true;
    } catch (error) {
      if ((error as { code?: string }).code === "ERR_REQUEST_CANCELED") return false;
      throw error;
    }
  }, [finish]);

  const signInWithGoogle = useCallback(async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) return false;
      const idToken = response.data.idToken ?? (await GoogleSignin.getTokens()).idToken;
      if (!idToken) throw new Error("Google didn’t return a sign-in token.");
      await finish(await api<SignInResult>("/api/auth/google", { body: { idToken, platform } }));
      return true;
    } catch (error) {
      if (isErrorWithCode(error) && error.code === statusCodes.IN_PROGRESS) return false;
      throw error;
    }
  }, [finish]);

  const startEmail = useCallback(async (email: string) => {
    await api("/api/auth/email/start", { body: { email } });
  }, []);

  const verifyEmail = useCallback(
    async (email: string, code: string) => {
      await finish(await api<SignInResult>("/api/auth/email/verify", { body: { email, code, platform } }));
    },
    [finish],
  );

  const refreshUser = useCallback(async () => {
    const me = await api<{ user: SessionUser }>("/api/me");
    setUser(me.user);
  }, []);

  const signOut = useCallback(async () => {
    await api("/api/auth/logout", { body: { pushToken: currentPushToken() } }).catch(() => undefined);
    await GoogleSignin.signOut().catch(() => undefined);
    await clearLocal();
  }, [clearLocal]);

  const deleteAccount = useCallback(async () => {
    await api("/api/account", { method: "DELETE", body: { confirm: "DELETE" } });
    await GoogleSignin.signOut().catch(() => undefined);
    await clearLocal();
  }, [clearLocal]);

  const value = useMemo<SessionState>(
    () => ({
      status,
      user,
      pendingInvite,
      setPendingInvite,
      signInWithApple,
      signInWithGoogle,
      startEmail,
      verifyEmail,
      refreshUser,
      markTermsAccepted: () => setUser((current) => (current ? { ...current, needsTerms: false } : current)),
      signOut,
      deleteAccount,
    }),
    [status, user, pendingInvite, signInWithApple, signInWithGoogle, startEmail, verifyEmail, refreshUser, signOut, deleteAccount],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be inside SessionProvider");
  return value;
}
