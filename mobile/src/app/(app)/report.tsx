import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Body, Button, ErrorBanner, Eyebrow, Title } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useDashboard } from "@/lib/dashboard";
import { colors } from "@/lib/theme";

// Mirrors REPORT_REASONS in lib/policies.ts on the server.
const reasons = [
  ["nudity_or_sexual", "Nudity or sexual content"],
  ["harassment_or_bullying", "Harassment or bullying"],
  ["hate_or_violence", "Hate, threats, or violence"],
  ["self_harm", "Self-harm or suicide"],
  ["minor_safety", "Child safety concern"],
  ["impersonation", "Pretending to be someone else"],
  ["not_consented", "A photo of me I didn’t agree to"],
  ["spam", "Spam"],
  ["other", "Something else"],
] as const;

export default function Report() {
  const params = useLocalSearchParams<{ targetType: "memory" | "photo" | "user"; targetId: string; userId?: string; label?: string }>();
  const { refresh } = useDashboard();
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [block, setBlock] = useState(params.targetType !== "memory");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canBlock = params.targetType !== "memory" && Boolean(params.userId);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/reports", {
        body: { targetType: params.targetType, targetId: params.targetId, reason, details, block: canBlock && block },
      });
      await refresh();
      router.back();
      Alert.alert(
        "Thanks for telling us",
        `Our team reviews every report within 24 hours.${canBlock && block ? " You’ve also blocked this person." : ""}${
          params.targetType === "memory" ? " This memory is hidden from your shelf." : ""
        }`,
      );
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Eyebrow>Report</Eyebrow>
        <Title style={{ marginTop: 8, fontSize: 30 }}>What’s wrong with {params.label ?? "this"}?</Title>
        <Body style={{ marginTop: 8 }}>Reports go to the Kinwhim safety team, not to the person you report.</Body>

        <View style={{ marginTop: 18 }}>
          {reasons.map(([value, label]) => (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ selected: reason === value }}
              onPress={() => setReason(value)}
              style={[styles.reason, reason === value && styles.reasonSelected]}
            >
              <Text style={[styles.reasonText, reason === value && { color: colors.cream }]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          accessibilityLabel="Anything else we should know"
          value={details}
          onChangeText={(value) => setDetails(value.slice(0, 1000))}
          placeholder="Anything else we should know? (optional)"
          placeholderTextColor={colors.muted}
          multiline
          style={styles.input}
        />

        {canBlock && (
          <View style={styles.block}>
            <Text style={{ flex: 1, fontWeight: "800", color: colors.ink }}>Also block this person</Text>
            <Switch value={block} onValueChange={setBlock} trackColor={{ true: colors.coral }} accessibilityLabel="Also block this person" />
          </View>
        )}

        <ErrorBanner message={error} onDismiss={() => setError(null)} />
        <Button label="Send report" variant="danger" busy={busy} disabled={!reason} onPress={() => void submit()} style={{ marginTop: 16 }} />
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} style={{ marginTop: 10 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  reason: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.line, marginBottom: 8, backgroundColor: "rgba(255,255,255,0.6)" },
  reasonSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  reasonText: { fontSize: 15, fontWeight: "800", color: colors.ink },
  input: {
    marginTop: 10,
    minHeight: 90,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 18,
    padding: 14,
    fontSize: 15,
    color: colors.ink,
    textAlignVertical: "top",
  },
  block: { flexDirection: "row", alignItems: "center", marginTop: 16, padding: 16, borderRadius: 18, backgroundColor: colors.paperDeep },
});
