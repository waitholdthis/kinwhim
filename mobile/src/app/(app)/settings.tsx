import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { Alert, Linking, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Body, Button, Card, Eyebrow, Row } from "@/components/ui";
import { confirm } from "@/lib/actions";
import { API_URL, api, errorMessage } from "@/lib/api";
import { useDashboard } from "@/lib/dashboard";
import { registerForPush } from "@/lib/push";
import { useSession } from "@/lib/session";
import { colors } from "@/lib/theme";

export default function Settings() {
  const { user, refreshUser, signOut, deleteAccount } = useSession();
  const { data, refresh } = useDashboard();
  const viewer = user ?? data?.viewer ?? null;
  const [name, setName] = useState(viewer?.name ?? "");
  const [notifications, setNotifications] = useState<"granted" | "denied" | "undetermined">("undetermined");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    void Notifications.getPermissionsAsync().then((result) =>
      setNotifications(result.granted ? "granted" : result.canAskAgain ? "undetermined" : "denied"),
    );
  }, []);

  const open = (path: string) => void WebBrowser.openBrowserAsync(`${API_URL}${path}`);

  async function saveName() {
    setBusy("name");
    try {
      await api("/api/me", { method: "PATCH", body: { name } });
      await Promise.all([refreshUser(), refresh()]);
    } catch (caught) {
      Alert.alert("Couldn’t save", errorMessage(caught));
    } finally {
      setBusy(null);
    }
  }

  async function deleteSelfies() {
    const ok = await confirm(
      "Delete all your selfies?",
      "Every raw selfie you’ve shared in every circle is deleted now. Memories already made stay unless you delete them.",
      "Delete selfies",
    );
    if (!ok) return;
    setBusy("selfies");
    try {
      await api("/api/account/selfies", { method: "DELETE" });
      await refresh();
      Alert.alert("Done", "Your selfies were deleted.");
    } catch (caught) {
      Alert.alert("Couldn’t delete", errorMessage(caught));
    } finally {
      setBusy(null);
    }
  }

  async function removeAccount() {
    const first = await confirm(
      "Delete your account?",
      "This permanently deletes your profile, sign-in, selfies, reactions, and every memory you appear in — for everyone. Circles you keep pass to the next member.",
      "Continue",
    );
    if (!first) return;
    const second = await confirm("Are you sure?", "This can’t be undone.", "Delete my account");
    if (!second) return;
    setBusy("account");
    try {
      await deleteAccount();
      router.replace("/sign-in");
    } catch (caught) {
      Alert.alert("Couldn’t delete your account", errorMessage(caught));
      setBusy(null);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} style={{ backgroundColor: colors.paper }}>
      <Card>
        <Eyebrow>Your name</Eyebrow>
        <TextInput
          accessibilityLabel="Display name"
          value={name}
          onChangeText={(value) => setName(value.slice(0, 40))}
          style={styles.input}
        />
        <Text style={styles.small}>{viewer?.email || "Private email"}</Text>
        <Button
          label="Save name"
          variant="ghost"
          busy={busy === "name"}
          disabled={!name.trim() || name.trim() === viewer?.name}
          onPress={() => void saveName()}
          style={{ marginTop: 12 }}
        />
      </Card>

      <Text style={styles.section}>Notifications</Text>
      <Row
        label="Memory alerts"
        detail={notifications === "granted" ? "On" : notifications === "denied" ? "Off · open Settings" : "Turn on"}
        onPress={() =>
          notifications === "denied"
            ? void Linking.openSettings()
            : void registerForPush({ prompt: true }).then((token) => setNotifications(token ? "granted" : "denied"))
        }
      />

      <Text style={styles.section}>Safety</Text>
      <Row label="Blocked people" onPress={() => router.push("/blocked")} />
      <Row label="Help & safety center" onPress={() => open("/support")} />
      <Row label="Contact support" detail="support@kinwhim.app" onPress={() => void Linking.openURL("mailto:support@kinwhim.app")} />
      <Row label="Report a safety concern" detail="safety@kinwhim.app" onPress={() => void Linking.openURL("mailto:safety@kinwhim.app")} />

      <Text style={styles.section}>Privacy</Text>
      <Body style={{ fontSize: 14, marginBottom: 4 }}>
        Raw selfies delete themselves after 14 days. AI memories are made only from selfies with “Transform my selfie” on.
      </Body>
      <Row label="Privacy Policy" onPress={() => open("/privacy")} />
      <Row label="Terms of Use" onPress={() => open("/terms")} />
      <Row label="Child Safety Standards" onPress={() => open("/safety")} />
      <Row label={busy === "selfies" ? "Deleting…" : "Delete all my selfies"} destructive onPress={() => void deleteSelfies()} />

      <Text style={styles.section}>Account</Text>
      <Row label="Sign out" onPress={() => void signOut().then(() => router.replace("/sign-in"))} />
      <Row label={busy === "account" ? "Deleting…" : "Delete account"} destructive onPress={() => void removeAccount()} />

      <View style={{ marginTop: 28, alignItems: "center" }}>
        <Text style={styles.small}>Kinwhim {Constants.expoConfig?.version}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  input: { marginTop: 8, fontSize: 20, fontWeight: "800", color: colors.ink, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
  small: { marginTop: 8, fontSize: 13, color: colors.muted },
  section: { marginTop: 28, marginBottom: 4, fontSize: 12, fontWeight: "900", letterSpacing: 2, textTransform: "uppercase", color: colors.rust },
});
