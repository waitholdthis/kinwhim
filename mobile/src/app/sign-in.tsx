import * as AppleAuthentication from "expo-apple-authentication";
import { Redirect, router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandMark, Body, Button, ErrorBanner, Eyebrow, Title } from "@/components/ui";
import { API_URL, errorMessage } from "@/lib/api";
import { useSession } from "@/lib/session";
import { colors } from "@/lib/theme";

export default function SignIn() {
  const { status, pendingInvite, signInWithApple, signInWithGoogle } = useSession();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [busy, setBusy] = useState<"apple" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === "ios") void AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  if (status === "signedIn") return <Redirect href="/" />;

  async function run(kind: "apple" | "google", action: () => Promise<boolean>) {
    setBusy(kind);
    setError(null);
    try {
      if (await action()) router.replace("/");
    } catch (caught) {
      setError(errorMessage(caught, "Sign-in didn’t finish. Try again."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={styles.container}>
        <BrandMark size={56} />
        <View style={{ marginTop: 36 }}>
          <Eyebrow>{pendingInvite ? "You’ve been invited" : "Kinwhim"}</Eyebrow>
          <Title style={{ fontSize: 46, lineHeight: 46, marginTop: 10 }}>One selfie. One shared little world.</Title>
          <Body style={{ marginTop: 16 }}>
            A private daily ritual for the people you never want to drift from. Circles are invitation-only.
          </Body>
        </View>

        <View style={styles.buttons}>
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
          {appleAvailable && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={26}
              style={{ height: 52, opacity: busy === "apple" ? 0.6 : 1 }}
              onPress={() => void run("apple", signInWithApple)}
            />
          )}
          <Button
            label="Continue with Google"
            variant="ghost"
            icon="G"
            busy={busy === "google"}
            onPress={() => void run("google", signInWithGoogle)}
          />
          <Button label="Continue with email" variant="ghost" icon="✉" onPress={() => router.push("/email")} />
        </View>

        <Text style={styles.legal}>
          By continuing you agree to the{" "}
          <Text style={styles.link} onPress={() => void WebBrowser.openBrowserAsync(`${API_URL}/terms`)}>Terms</Text> and{" "}
          <Text style={styles.link} onPress={() => void WebBrowser.openBrowserAsync(`${API_URL}/privacy`)}>Privacy Policy</Text>.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 48, flexGrow: 1 },
  buttons: { marginTop: 40, gap: 12 },
  legal: { marginTop: 28, textAlign: "center", fontSize: 13, lineHeight: 19, color: colors.muted },
  link: { textDecorationLine: "underline", color: colors.ink },
});
