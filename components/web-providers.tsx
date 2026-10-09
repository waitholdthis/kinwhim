"use client";

import { useEffect, useRef, useState } from "react";

export type WebProviderConfig = {
  google: { clientId: string } | null;
  apple: { clientId: string; redirectUri: string } | null;
};

type GoogleId = {
  accounts: {
    id: {
      initialize: (options: { client_id: string; callback: (response: { credential: string }) => void; ux_mode?: string }) => void;
      renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
    };
  };
};

type AppleId = {
  auth: {
    init: (options: { clientId: string; scope: string; redirectURI: string; nonce: string; state: string; usePopup: boolean }) => void;
    signIn: () => Promise<{
      authorization: { id_token: string; code: string };
      user?: { name?: { firstName?: string; lastName?: string } };
    }>;
  };
};

declare global {
  interface Window {
    google?: GoogleId;
    AppleID?: AppleId;
  }
}

const GOOGLE_SCRIPT = "https://accounts.google.com/gsi/client";
const APPLE_SCRIPT = "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";

// Sign in with Apple and Google on the website. Both hand us an ID token that
// the same /api/auth endpoints the app uses verify and turn into a session.
export function WebProviders({
  config,
  onToken,
  onError,
}: {
  config: WebProviderConfig;
  onToken: (path: string, body: Record<string, unknown>) => Promise<void>;
  onError: (message: string) => void;
}) {
  const googleButton = useRef<HTMLDivElement>(null);
  const [appleReady, setAppleReady] = useState(false);
  const [appleBusy, setAppleBusy] = useState(false);
  // Keep the latest callbacks without re-initializing the provider scripts.
  const handlers = useRef({ onToken, onError });
  useEffect(() => {
    handlers.current = { onToken, onError };
  });

  useEffect(() => {
    const google = config.google;
    if (!google) return;
    loadScript(GOOGLE_SCRIPT)
      .then(() => {
        if (!window.google || !googleButton.current) return;
        window.google.accounts.id.initialize({
          client_id: google.clientId,
          callback: ({ credential }) =>
            void handlers.current.onToken("/api/auth/google", { idToken: credential, platform: "web" }),
        });
        window.google.accounts.id.renderButton(googleButton.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          width: googleButton.current.offsetWidth || 360,
        });
      })
      .catch(() => handlers.current.onError("Google sign-in couldn’t load. Check your connection."));
  }, [config.google]);

  useEffect(() => {
    if (!config.apple) return;
    loadScript(APPLE_SCRIPT)
      .then(() => setAppleReady(Boolean(window.AppleID)))
      .catch(() => handlers.current.onError("Sign in with Apple couldn’t load. Check your connection."));
  }, [config.apple]);

  async function signInWithApple() {
    if (!config.apple || !window.AppleID) return;
    setAppleBusy(true);
    try {
      // Apple embeds the nonce we give it; we send Apple its hash and the server the raw value.
      const rawNonce = crypto.randomUUID();
      window.AppleID.auth.init({
        clientId: config.apple.clientId,
        scope: "name email",
        redirectURI: config.apple.redirectUri,
        nonce: await sha256Hex(rawNonce),
        state: crypto.randomUUID(),
        usePopup: true,
      });
      const result = await window.AppleID.auth.signIn();
      await handlers.current.onToken("/api/auth/apple", {
        identityToken: result.authorization.id_token,
        authorizationCode: result.authorization.code,
        nonce: rawNonce,
        givenName: result.user?.name?.firstName ?? "",
        familyName: result.user?.name?.lastName ?? "",
        platform: "web",
      });
    } catch (caught) {
      // Closing the popup rejects with { error: "popup_closed_by_user" }.
      const code = (caught as { error?: string })?.error;
      if (code !== "popup_closed_by_user" && code !== "user_cancelled_authorize") {
        handlers.current.onError(caught instanceof Error ? caught.message : "Sign in with Apple didn’t finish.");
      }
    } finally {
      setAppleBusy(false);
    }
  }

  if (!config.google && !config.apple) return null;
  return (
    <div className="mt-8 grid gap-3">
      {config.apple && (
        <button
          type="button"
          onClick={() => void signInWithApple()}
          disabled={!appleReady || appleBusy}
          className="flex h-11 items-center justify-center gap-2 rounded-full bg-black px-5 text-[15px] font-semibold text-white disabled:opacity-50"
        >
          <svg aria-hidden width="16" height="19" viewBox="0 0 814 1000" fill="currentColor">
            <path d="M788 341c-6 4-108 62-108 190 0 148 130 200 134 201-1 3-21 72-69 142-43 62-88 124-156 124s-86-40-165-40c-77 0-104 41-166 41s-106-57-156-127C44 790 0 669 0 554c0-185 120-283 239-283 63 0 115 41 155 41 38 0 97-44 168-44 27 0 124 3 188 94zM554 167c30-35 51-84 51-133 0-7-1-14-2-19-48 2-106 32-140 72-27 31-52 80-52 130 0 7 1 15 2 17 3 1 8 1 13 1 43 0 98-29 128-68z" />
          </svg>
          Continue with Apple
        </button>
      )}
      {config.google && <div ref={googleButton} className="flex min-h-11 w-full justify-center" />}
      <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-[#6d675a]">
        <span className="h-px flex-1 bg-[#29251d]/15" /> or email <span className="h-px flex-1 bg-[#29251d]/15" />
      </div>
    </div>
  );
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing?.dataset.loaded) return resolve();
    const script = existing ?? document.createElement("script");
    script.addEventListener("load", () => {
      script.dataset.loaded = "1";
      resolve();
    });
    script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)));
    if (!existing) {
      script.src = src;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
