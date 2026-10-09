import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Body, Button, ErrorBanner, Eyebrow, Title } from "@/components/ui";
import { API_URL, api, errorMessage } from "@/lib/api";
import { useDashboard } from "@/lib/dashboard";
import { useSession } from "@/lib/session";
import { colors } from "@/lib/theme";

const promises = [
  ["📸", "Only share photos of yourself. No nudity, harassment, hate, or anything that would hurt someone. Kinwhim has zero tolerance for objectionable content."],
  ["✨", "When “Transform my selfie” is on, that photo, your name, mood, and caption go to OpenAI’s image API to make your circle’s nightly memory."],
  ["🗓️", "Raw selfies are deleted automatically after 14 days. Memories stay until someone in them deletes them."],
  ["🛡️", "Report or block anyone, leave any circle, and delete your selfies or account at any time. We review reports within 24 hours."],
] as const;

export default function Terms() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const { data, refresh } = useDashboard();
  const { markTermsAccepted } = useSession();
  const [agreed, setAgreed] = useState(false);
  const [aiConsent, setAiConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/account/terms", { body: { version: data?.termsVersion, ageConfirmed: true } });
      markTermsAccepted();
      await refresh();
      router.back();
      if (next === "checkin") router.push("/checkin");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
        <Eyebrow>Before your first selfie</Eyebrow>
        <Title style={{ marginTop: 8 }}>A few promises.</Title>
        <View style={{ marginTop: 20, gap: 14 }}>
          {promises.map(([icon, text]) => (
            <View key={icon} style={styles.promise}>
              <Text style={{ fontSize: 22 }}>{icon}</Text>
              <Body style={{ flex: 1, fontSize: 15 }}>{text}</Body>
            </View>
          ))}
        </View>

        <Check
          checked={aiConsent}
          onToggle={() => setAiConsent(!aiConsent)}
          label="I allow Kinwhim to send selfies I opt in to OpenAI to create AI memories. I can turn this off on any check-in."
        />
        <Check
          checked={agreed}
          onToggle={() => setAgreed(!agreed)}
          label="I’m 13 or older and agree to the Terms of Use and Privacy Policy."
        />
        <View style={{ flexDirection: "row", gap: 18, marginTop: 6 }}>
          <Text style={styles.link} onPress={() => void WebBrowser.openBrowserAsync(`${API_URL}/terms`)}>Read the Terms</Text>
          <Text style={styles.link} onPress={() => void WebBrowser.openBrowserAsync(`${API_URL}/privacy`)}>Read the Privacy Policy</Text>
        </View>

        <ErrorBanner message={error} onDismiss={() => setError(null)} />
        <Button label="Agree and continue" busy={busy} disabled={!agreed || !aiConsent} onPress={() => void accept()} style={{ marginTop: 24 }} />
        <Button label="Not now" variant="ghost" onPress={() => router.back()} style={{ marginTop: 10 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Check({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={onToggle} style={styles.check}>
      <View style={[styles.box, checked && { backgroundColor: colors.ink }]}>
        {checked && <Text style={{ color: colors.cream, fontWeight: "900" }}>✓</Text>}
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  promise: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  check: { flexDirection: "row", gap: 12, alignItems: "flex-start", marginTop: 20 },
  box: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: colors.ink, alignItems: "center", justifyContent: "center" },
  checkLabel: { flex: 1, fontSize: 15, lineHeight: 21, fontWeight: "700", color: colors.ink },
  link: { color: colors.ink, fontWeight: "700", textDecorationLine: "underline", marginTop: 10 },
});
