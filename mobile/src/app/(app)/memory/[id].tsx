import * as Haptics from "expo-haptics";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MiniMovie } from "@/components/mini-movie";
import { AuthImage, Body, Button, ErrorBanner, Eyebrow, Title } from "@/components/ui";
import { confirm, showActions } from "@/lib/actions";
import { api, errorMessage } from "@/lib/api";
import { useDashboard } from "@/lib/dashboard";
import { downloadMemory, saveToPhotos, shareImage } from "@/lib/media";
import { colors, reactionEmoji } from "@/lib/theme";
import { prettyDate } from "@/lib/format";

export default function MemoryScreen() {
  const { id, circle } = useLocalSearchParams<{ id: string; circle?: string }>();
  const { data, circleId, selectCircle, refresh } = useDashboard();
  const [busy, setBusy] = useState<"save" | "share" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // A notification can point at a memory in another circle.
  useEffect(() => {
    if (circle && circle !== circleId) void selectCircle(circle);
  }, [circle, circleId, selectCircle]);

  const memory = data?.memories.find((candidate) => candidate.id === id);

  useEffect(() => {
    if (memory && !memory.isRead) {
      void api("/api/notifications", { body: { memoryId: memory.id } }).then(() => refresh());
    }
  }, [memory, refresh]);

  if (!data || !memory) {
    return (
      <View style={styles.center}>
        <Body>{data ? "This memory is no longer here." : "Loading…"}</Body>
      </View>
    );
  }

  const canDelete = data.circle?.ownerId === data.viewer.id || memory.featuresViewer;

  async function withFile(kind: "save" | "share") {
    setBusy(kind);
    setError(null);
    try {
      const uri = await downloadMemory(memory!.mediaUrl, memory!.day);
      if (kind === "save") {
        await saveToPhotos(uri);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Saved to Photos", "This little world is in your library now.");
      } else {
        await shareImage(uri);
      }
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(null);
    }
  }

  async function react(emoji: string) {
    void Haptics.selectionAsync();
    try {
      await api("/api/reactions", { body: { memoryId: memory!.id, emoji } });
      await refresh();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  function more() {
    showActions(memory!.title, [
      {
        label: "Report memory",
        destructive: true,
        onPress: () => router.push({ pathname: "/report", params: { targetType: "memory", targetId: memory!.id, label: "this memory" } }),
      },
      ...(canDelete
        ? [
            {
              label: "Delete for everyone",
              destructive: true,
              onPress: async () => {
                if (!(await confirm("Delete this memory?", "It’s removed for everyone in the circle. This can’t be undone.", "Delete"))) return;
                try {
                  await api(`/api/memories/${encodeURIComponent(memory!.id)}`, { method: "DELETE" });
                  await refresh();
                  router.back();
                } catch (caught) {
                  setError(errorMessage(caught));
                }
              },
            },
          ]
        : []),
    ]);
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable accessibilityRole="button" accessibilityLabel="More options" onPress={more} hitSlop={12}>
              <Text style={{ fontSize: 22, fontWeight: "900", color: colors.ink }}>•••</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        <Eyebrow>{prettyDate(memory.day)}</Eyebrow>
        <Title style={{ marginTop: 6, fontSize: 32 }}>{memory.title}</Title>
        <AuthImage path={memory.mediaUrl} style={styles.image} contentFit="cover" accessibilityLabel={`AI memory: ${memory.title}`} />
        <Text style={styles.aiNote}>Made with AI from your circle’s opted-in selfies.</Text>

        <ErrorBanner message={error} onDismiss={() => setError(null)} />

        <View style={styles.reactions}>
          {reactionEmoji.map((emoji) => (
            <Pressable key={emoji} accessibilityRole="button" accessibilityLabel={`React ${emoji}`} onPress={() => void react(emoji)} style={styles.reaction}>
              <Text style={{ fontSize: 24 }}>{emoji}</Text>
            </Pressable>
          ))}
        </View>
        {memory.reactions.length > 0 && <Body style={{ textAlign: "center" }}>{memory.reactions.join(" ")}</Body>}

        <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
          <Button label="Save to Photos" icon="⤓" busy={busy === "save"} onPress={() => void withFile("save")} style={{ flex: 1 }} />
          <Button label="Share" icon="↗" variant="ghost" busy={busy === "share"} onPress={() => void withFile("share")} style={{ flex: 1 }} />
        </View>
        <MiniMovie mediaUrl={memory.mediaUrl} day={memory.day} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper },
  image: { marginTop: 16, aspectRatio: 1, borderRadius: 28, backgroundColor: colors.paperDeep },
  aiNote: { marginTop: 8, fontSize: 12, color: colors.muted, textAlign: "center" },
  reactions: { flexDirection: "row", justifyContent: "center", gap: 10, marginTop: 18, marginBottom: 8 },
  reaction: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.7)" },
});
