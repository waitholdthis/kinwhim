import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Body, Button, Card, Chip, ErrorBanner, Eyebrow, Title } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useDashboard } from "@/lib/dashboard";
import { useSession } from "@/lib/session";
import { colors } from "@/lib/theme";

type Preview = { id: string; name: string; keeperName: string | null; memberCount: number; alreadyMember: boolean };

export default function NewCircle() {
  const params = useLocalSearchParams<{ code?: string; mode?: string }>();
  const { selectCircle } = useDashboard();
  const { setPendingInvite } = useSession();
  const [mode, setMode] = useState<"create" | "join">(params.code || params.mode === "join" ? "join" : "create");
  const [name, setName] = useState("");
  const [code, setCode] = useState(params.code ?? "");
  // The preview is remembered with the code it belongs to, so a stale lookup never shows.
  const [lookup, setLookup] = useState<{ code: string; circle: Preview | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmedCode = code.trim().toUpperCase();
  const preview = mode === "join" && lookup?.code === trimmedCode ? lookup.circle : null;

  // A deep-linked invite is consumed as soon as it's on screen.
  useEffect(() => {
    if (params.code) setPendingInvite(null);
  }, [params.code, setPendingInvite]);

  useEffect(() => {
    if (mode !== "join" || trimmedCode.length < 6) return;
    const timer = setTimeout(() => {
      api<{ circle: Preview }>(`/api/invites/${encodeURIComponent(trimmedCode)}`)
        .then((result) => setLookup({ code: trimmedCode, circle: result.circle }))
        .catch(() => setLookup({ code: trimmedCode, circle: null }));
    }, 350);
    return () => clearTimeout(timer);
  }, [trimmedCode, mode]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ circleId: string }>("/api/circles", {
        body:
          mode === "join"
            ? { action: "join", code: code.trim() }
            : { action: "create", name: name.trim(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      });
      await selectCircle(result.circleId);
      router.dismissAll();
      router.replace(mode === "create" ? "/circle" : "/today");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
          <Eyebrow>{mode === "join" ? "Join a circle" : "Start a circle"}</Eyebrow>
          <Title style={{ marginTop: 8 }}>{mode === "join" ? "Knock knock." : "Name your people."}</Title>
          <View style={styles.toggle}>
            <Chip label="Start a circle" selected={mode === "create"} onPress={() => setMode("create")} />
            <Chip label="Join with a code" selected={mode === "join"} onPress={() => setMode("join")} />
          </View>

          <ErrorBanner message={error} onDismiss={() => setError(null)} />

          {mode === "create" ? (
            <>
              <TextInput
                accessibilityLabel="Circle name"
                value={name}
                onChangeText={(value) => setName(value.slice(0, 48))}
                placeholder="The Sunday Sillies"
                placeholderTextColor={colors.muted}
                style={styles.input}
                autoFocus
              />
              <Body style={{ marginTop: 10, fontSize: 14 }}>You’ll be the keeper. Invite up to 9 friends with a private code.</Body>
            </>
          ) : (
            <>
              <TextInput
                accessibilityLabel="Invite code"
                value={code}
                onChangeText={(value) => setCode(value.toUpperCase())}
                placeholder="BLOOM-7KQ2MX"
                placeholderTextColor={colors.muted}
                autoCapitalize="characters"
                autoCorrect={false}
                style={[styles.input, { letterSpacing: 2, fontWeight: "900" }]}
                autoFocus={!params.code}
              />
              {preview && (
                <Card style={{ marginTop: 14 }}>
                  <Eyebrow>{preview.alreadyMember ? "You’re already in" : "You’re joining"}</Eyebrow>
                  <Title style={{ fontSize: 26, marginTop: 4 }}>{preview.name}</Title>
                  <Body style={{ fontSize: 14 }}>
                    Kept by {preview.keeperName ?? "a friend"} · {preview.memberCount} {preview.memberCount === 1 ? "member" : "members"}
                  </Body>
                </Card>
              )}
            </>
          )}

          <Button
            label={mode === "join" ? (preview ? `Join ${preview.name}` : "Join circle") : "Create circle"}
            busy={busy}
            disabled={mode === "join" ? code.trim().length < 4 : !name.trim()}
            onPress={() => void submit()}
            style={{ marginTop: 24 }}
          />
          <Button label="Cancel" variant="ghost" onPress={() => router.back()} style={{ marginTop: 10 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: "row", gap: 8, marginVertical: 20 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 18,
    color: colors.ink,
  },
});
