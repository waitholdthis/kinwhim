import { router } from "expo-router";
import { Alert, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Body, Button, Card, Eyebrow, Row, Title } from "@/components/ui";
import { confirm } from "@/lib/actions";
import { api, API_URL, errorMessage } from "@/lib/api";
import { useDashboard } from "@/lib/dashboard";
import { hourLabel } from "@/lib/format";
import { openMemberActions } from "@/lib/member-actions";
import { colors, fonts } from "@/lib/theme";

export default function CircleTab() {
  const { data, refresh } = useDashboard();
  if (!data?.circle) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper, padding: 24 }}>
        <Title>No circle yet.</Title>
        <Button label="Start or join a circle" style={{ marginTop: 20 }} onPress={() => router.push("/new-circle")} />
      </SafeAreaView>
    );
  }
  const circle = data.circle;
  const isKeeper = circle.ownerId === data.viewer.id;
  const inviteUrl = circle.inviteUrl ?? `${API_URL}/join/${circle.inviteCode}`;

  async function invite() {
    await Share.share({
      message: `Join my private Kinwhim circle “${circle.name}”. One selfie a day, one shared little world. ${inviteUrl}`,
    });
  }

  async function resetInvite() {
    const ok = await confirm("Reset the invite code?", "The current code and links stop working. Friends already in the circle stay.", "Reset", false);
    if (!ok) return;
    try {
      await api("/api/circles/invite", { body: { circleId: circle.id } });
      await refresh();
    } catch (caught) {
      Alert.alert("Couldn’t reset", errorMessage(caught));
    }
  }

  async function leave() {
    const ok = await confirm(
      `Leave ${circle.name}?`,
      isKeeper
        ? "Your selfies here are deleted and the next longest-standing member becomes keeper. If you’re the last one, the circle and its memories are deleted."
        : "Your selfies in this circle are deleted. You’ll need a new invite to come back.",
      "Leave",
    );
    if (!ok) return;
    try {
      await api("/api/circles/members", { method: "DELETE", body: { circleId: circle.id, userId: data!.viewer.id } });
      await refresh();
      router.replace("/today");
    } catch (caught) {
      Alert.alert("Couldn’t leave", errorMessage(caught));
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }} refreshControl={<RefreshControl refreshing={false} onRefresh={() => void refresh()} />}>
        <Card tone="ink">
          <Eyebrow color={colors.butter}>Your circle</Eyebrow>
          <Text style={styles.name}>{circle.name}</Text>
          <Body style={{ color: "rgba(255,248,232,0.7)", marginTop: 6 }}>
            {data.members.length} of 10 friends · reveals at {hourLabel(circle.revealHour)} · {circle.style}
          </Body>
          <View style={styles.code}>
            <Text style={styles.codeLabel}>Invite code</Text>
            <Text style={styles.codeValue} selectable>{circle.inviteCode}</Text>
          </View>
          <Button label="Invite a friend" icon="✉" variant="light" onPress={() => void invite()} style={{ marginTop: 16 }} />
          <Text style={styles.hint}>Only people with this code can join. The link opens Kinwhim and fills it in.</Text>
        </Card>

        <Eyebrow>Members</Eyebrow>
        <View style={{ marginTop: 6, marginBottom: 20 }}>
          {data.members.map((member) => (
            <Pressable
              key={member.id}
              accessibilityRole="button"
              accessibilityHint={member.id === data.viewer.id ? undefined : "Report, block, or remove"}
              onPress={() => openMemberActions({ member, circle, viewerId: data.viewer.id, refresh })}
              style={styles.member}
            >
              <View style={styles.avatar}>
                <Text style={{ fontWeight: "900", color: colors.ink }}>{member.name.slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>
                  {member.name}
                  {member.id === data.viewer.id ? " (you)" : ""}
                </Text>
                <Text style={styles.memberMeta}>
                  {member.role === "owner" ? "Keeper" : "Member"}
                  {member.blocked ? " · Blocked" : ""}
                </Text>
              </View>
              {member.id !== data.viewer.id && <Text style={{ color: colors.muted, fontSize: 20 }}>•••</Text>}
            </Pressable>
          ))}
        </View>

        {isKeeper && (
          <>
            <Row label="Circle settings" detail="Name, reveal time, style" onPress={() => router.push("/circle-settings")} />
            <Row label="Reset invite code" onPress={() => void resetInvite()} />
          </>
        )}
        <Row label="Start or join another circle" onPress={() => router.push("/new-circle")} />
        <Row label="Settings & privacy" onPress={() => router.push("/settings")} />
        <Row label="Leave this circle" destructive onPress={() => void leave()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  name: { fontFamily: fonts.serif, fontSize: 40, lineHeight: 42, fontWeight: "900", color: colors.cream, marginTop: 6 },
  code: { marginTop: 18, borderRadius: 20, backgroundColor: "rgba(255,248,232,0.08)", padding: 16, alignItems: "center" },
  codeLabel: { color: colors.butter, fontSize: 11, fontWeight: "900", letterSpacing: 2, textTransform: "uppercase" },
  codeValue: { color: colors.cream, fontSize: 28, fontWeight: "900", letterSpacing: 3, marginTop: 6, fontVariant: ["tabular-nums"] },
  hint: { marginTop: 12, color: "rgba(255,248,232,0.6)", fontSize: 12, textAlign: "center" },
  member: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.butter, alignItems: "center", justifyContent: "center" },
  memberName: { fontSize: 16, fontWeight: "800", color: colors.ink },
  memberMeta: { fontSize: 13, color: colors.muted, marginTop: 2 },
});
