import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Button, Chip, ErrorBanner, Eyebrow } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useDashboard } from "@/lib/dashboard";
import { hourLabel } from "@/lib/format";
import { colors, memoryStyles } from "@/lib/theme";

export default function CircleSettings() {
  const { data, refresh } = useDashboard();
  const circle = data?.circle;
  const [name, setName] = useState(circle?.name ?? "");
  const [revealHour, setRevealHour] = useState(circle?.revealHour ?? 21);
  const [style, setStyle] = useState(circle?.style ?? "whimsical");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!circle) return null;

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api("/api/circles/settings", {
        method: "PATCH",
        body: { circleId: circle!.id, name: name.trim(), revealHour, timezone: circle!.timezone, style },
      });
      await refresh();
      router.back();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: colors.paper }} contentContainerStyle={{ padding: 20, gap: 8 }}>
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <Eyebrow>Name</Eyebrow>
      <TextInput accessibilityLabel="Circle name" value={name} onChangeText={(value) => setName(value.slice(0, 48))} style={styles.input} />

      <Eyebrow>Reveal time</Eyebrow>
      <View style={styles.stepper}>
        <Button label="−" variant="ghost" onPress={() => setRevealHour((revealHour + 23) % 24)} style={styles.step} accessibilityLabel="Earlier" />
        <Text style={styles.hour}>{hourLabel(revealHour)}</Text>
        <Button label="+" variant="ghost" onPress={() => setRevealHour((revealHour + 1) % 24)} style={styles.step} accessibilityLabel="Later" />
      </View>
      <Text style={styles.small}>Time zone: {circle.timezone}</Text>

      <Eyebrow>Memory style</Eyebrow>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {memoryStyles.map((option) => (
          <Chip key={option} label={option} selected={style === option} onPress={() => setStyle(option)} />
        ))}
      </View>
      <Button label="Save" busy={busy} disabled={!name.trim()} onPress={() => void save()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  input: { fontSize: 20, fontWeight: "800", color: colors.ink, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line, marginBottom: 16 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 16 },
  step: { width: 56, paddingHorizontal: 0 },
  hour: { fontSize: 22, fontWeight: "900", color: colors.ink, minWidth: 110, textAlign: "center" },
  small: { fontSize: 13, color: colors.muted, marginBottom: 16 },
});
