import { router } from "expo-router";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthImage, BrandMark, Body, Button, Card, ErrorBanner, Eyebrow, Title } from "@/components/ui";
import { showActions } from "@/lib/actions";
import { api, errorMessage } from "@/lib/api";
import { useDashboard } from "@/lib/dashboard";
import { friendlyDay, hourLabel } from "@/lib/format";
import { openMemberActions } from "@/lib/member-actions";
import { colors, fonts, moods } from "@/lib/theme";
import type { Member } from "@/lib/types";

const tileColors = [colors.coral, colors.butter, colors.sage, colors.peach, "#e7b4a2"];

export default function Today() {
  const { data, loading, error, refresh, selectCircle } = useDashboard();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (!data) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <BrandMark size={48} />
          <Text style={styles.loading}>{loading ? "Gathering the little things…" : error}</Text>
          {!loading && <Button label="Try again" variant="ghost" onPress={() => void refresh()} style={{ marginTop: 16 }} />}
        </View>
      </SafeAreaView>
    );
  }

  if (!data.circle) return <EmptyHome name={data.viewer.name} />;

  const circle = data.circle;
  const me = data.members.find((member) => member.id === data.viewer.id);
  const checked = data.members.filter((member) => member.checkedIn).length;
  const allChecked = checked === data.members.length && data.members.length > 0;
  const hasToday = data.memories.some((memory) => memory.day === data.today);
  const latest = data.memories[0];

  function openCheckin() {
    router.push(data!.viewer.needsTerms ? { pathname: "/terms", params: { next: "checkin" } } : "/checkin");
  }

  async function makeWorld() {
    setBusy(true);
    setNotice(null);
    try {
      const result = await api<{ pending?: boolean; memoryId?: string }>("/api/generate", {
        body: { circleId: circle.id, day: data!.today },
      });
      if (result.pending) setNotice("Tonight’s world is already being made. Give it a minute.");
      await refresh();
      if (result.memoryId) router.push({ pathname: "/memory/[id]", params: { id: result.memoryId } });
    } catch (caught) {
      setNotice(errorMessage(caught, "Tonight’s world needs another minute."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => void refresh()} />}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityHint="Switch circles"
            onPress={() =>
              showActions("Your circles", [
                ...data.circles.map((option) => ({ label: option.name, onPress: () => void selectCircle(option.id) })),
                { label: "Start or join another circle", onPress: () => router.push("/new-circle") },
              ])
            }
          >
            <Eyebrow>{friendlyDay(data.today)} · {circle.name} ▾</Eyebrow>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => router.push("/settings")} hitSlop={12}>
            <Text style={{ fontSize: 22 }}>⚙︎</Text>
          </Pressable>
        </View>
        <Title style={{ marginTop: 8, fontSize: 38, lineHeight: 40 }}>
          {me?.checkedIn ? "You’re in. Let the day unfold." : "Show up exactly as you are."}
        </Title>

        <ErrorBanner message={notice ?? error} onDismiss={() => setNotice(null)} />

        <Card tone="ink" style={{ marginTop: 20 }}>
          <Text style={styles.rollEyebrow}>Today’s roll call</Text>
          <Text style={styles.rollTitle}>{checked} of {data.members.length} friends are here</Text>
          <View style={styles.grid}>
            {data.members.map((member, index) => (
              <MemberTile
                key={member.id}
                member={member}
                index={index}
                isMe={member.id === data.viewer.id}
                onLongPress={() =>
                  openMemberActions({ member, circle, viewerId: data.viewer.id, refresh, includePhoto: true })
                }
              />
            ))}
          </View>
          <Text style={styles.private}>🔒 Private to this circle · long-press a friend to report or block</Text>
          <Button
            label={me?.checkedIn ? "Checked in · retake" : "Take today’s selfie"}
            icon={me?.checkedIn ? "✓" : "📸"}
            variant="light"
            onPress={openCheckin}
            style={{ marginTop: 16 }}
          />
        </Card>

        <Card tone="coral" style={{ marginTop: 16 }}>
          <Eyebrow color={colors.ink}>Tonight</Eyebrow>
          <Text style={styles.cardTitle}>{hasToday ? "Tonight’s world is ready." : "A tiny world is waiting."}</Text>
          <Body style={{ color: "rgba(36,33,23,0.75)", marginTop: 6 }}>
            Kinwhim blends everyone’s opted-in selfies into one playful scene after {hourLabel(circle.revealHour)}.
          </Body>
          {!hasToday && (
            <Button
              label={allChecked ? "Make tonight’s world" : `Waiting on ${data.members.length - checked}`}
              icon="✨"
              disabled={!allChecked}
              busy={busy}
              onPress={() => void makeWorld()}
              style={{ marginTop: 16 }}
            />
          )}
        </Card>

        {latest && (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/memory/[id]", params: { id: latest.id } })}
          >
            <Card tone="sage" style={{ marginTop: 16, flexDirection: "row", alignItems: "center", gap: 14 }}>
              <AuthImage path={latest.mediaUrl} style={{ width: 64, height: 64, borderRadius: 16 }} accessibilityLabel="Latest memory" />
              <View style={{ flex: 1 }}>
                <Eyebrow color={colors.moss}>Memory shelf</Eyebrow>
                <Text style={[styles.cardTitle, { fontSize: 20 }]} numberOfLines={1}>{latest.title}</Text>
              </View>
            </Card>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MemberTile({ member, index, isMe, onLongPress }: { member: Member; index: number; isMe: boolean; onLongPress: () => void }) {
  const mood = moods.find(([name]) => name === member.mood)?.[1];
  return (
    <Pressable
      onLongPress={isMe ? undefined : onLongPress}
      delayLongPress={350}
      accessibilityLabel={`${member.name}${member.checkedIn ? ", checked in" : ", not checked in yet"}`}
      accessibilityHint={isMe ? undefined : "Long-press to report or block"}
      style={styles.tileWrap}
    >
      <View style={[styles.tile, { backgroundColor: tileColors[index % tileColors.length] }]}>
        {member.photoUrl ? (
          <AuthImage path={member.photoUrl} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <Text style={styles.tileInitial}>{member.blocked ? "⦸" : member.name.slice(0, 1).toUpperCase()}</Text>
        )}
        {mood && <Text style={styles.tileMood}>{mood}</Text>}
        {!member.checkedIn && <View style={styles.tileWaiting} />}
      </View>
      <Text style={styles.tileName} numberOfLines={1}>{isMe ? "You" : member.name.split(" ")[0]}</Text>
    </Pressable>
  );
}

function EmptyHome({ name }: { name: string }) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: 40 }]}>
        <BrandMark size={52} />
        <Eyebrow>{`Hello, ${name.split(" ")[0]}`}</Eyebrow>
        <Title style={{ fontSize: 48, lineHeight: 48, marginTop: 10 }}>One selfie. One shared little world.</Title>
        <Body style={{ marginTop: 16 }}>
          Start a private circle for up to 10 friends, or join one with an invite code. Show up once a day; Kinwhim turns the group into
          something delightfully unexpected.
        </Body>
        <Button label="Start a circle" icon="✨" style={{ marginTop: 28 }} onPress={() => router.push("/new-circle")} />
        <Button
          label="I have an invite code"
          variant="ghost"
          style={{ marginTop: 12 }}
          onPress={() => router.push({ pathname: "/new-circle", params: { mode: "join" } })}
        />
        <Button label="Settings" variant="ghost" style={{ marginTop: 12 }} onPress={() => router.push("/settings")} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  scroll: { padding: 20, paddingBottom: 40, gap: 0 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  loading: { marginTop: 18, fontFamily: fonts.serif, fontSize: 22, fontWeight: "900", color: colors.ink, textAlign: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rollEyebrow: { color: colors.peach, fontWeight: "800" },
  rollTitle: { color: colors.cream, fontFamily: fonts.serif, fontSize: 28, fontWeight: "900", marginTop: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 18 },
  tileWrap: { width: "30.5%" },
  tile: { aspectRatio: 0.82, borderRadius: 20, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  tileInitial: { fontSize: 26, fontWeight: "900", color: colors.ink },
  tileMood: { position: "absolute", right: 6, bottom: 6, fontSize: 18 },
  tileWaiting: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(36,33,23,0.35)" },
  tileName: { marginTop: 6, textAlign: "center", color: "rgba(255,248,232,0.75)", fontSize: 12, fontWeight: "700" },
  private: { marginTop: 18, color: "rgba(255,248,232,0.7)", fontSize: 13 },
  cardTitle: { fontFamily: fonts.serif, fontSize: 28, fontWeight: "900", color: colors.ink, marginTop: 8 },
});
