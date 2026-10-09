import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Body, Button, ErrorBanner, Eyebrow, Title } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { useSession } from "@/lib/session";
import { colors } from "@/lib/theme";

export default function EmailSignIn() {
  const { startEmail, verifyEmail } = useSession();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (!sent) {
        await startEmail(email.trim());
        setSent(true);
      } else {
        await verifyEmail(email.trim(), code);
        router.dismissAll();
        router.replace("/");
      }
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
        <Eyebrow>Email sign-in</Eyebrow>
        <Title style={{ marginTop: 8 }}>{sent ? "Check your inbox." : "What’s your email?"}</Title>
        <Body style={{ marginTop: 10 }}>
          {sent ? `We sent a 6-digit code to ${email.trim()}.` : "We’ll email you a code. No password to remember."}
        </Body>
        <View style={{ marginTop: 28, gap: 12 }}>
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
          <TextInput
            accessibilityLabel="Email address"
            value={email}
            onChangeText={setEmail}
            editable={!sent}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="you@example.com"
            placeholderTextColor={colors.muted}
            style={[styles.input, sent && { opacity: 0.6 }]}
          />
          {sent && (
            <TextInput
              accessibilityLabel="6-digit code"
              value={code}
              onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
              autoFocus
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              placeholder="123456"
              placeholderTextColor={colors.muted}
              style={[styles.input, styles.code]}
            />
          )}
          <Button
            label={sent ? "Sign in" : "Email me a code"}
            busy={busy}
            disabled={sent ? code.length !== 6 : !email.includes("@")}
            onPress={() => void submit()}
          />
          {sent && (
            <Button label="Use a different email" variant="ghost" onPress={() => { setSent(false); setCode(""); }} />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 32 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 17,
    color: colors.ink,
  },
  code: { fontSize: 28, fontWeight: "900", letterSpacing: 10, textAlign: "center" },
});
