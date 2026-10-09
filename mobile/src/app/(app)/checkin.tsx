import { CameraView, useCameraPermissions } from "expo-camera";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthImage, Body, Button, Chip, ErrorBanner, Eyebrow, Title } from "@/components/ui";
import { confirm } from "@/lib/actions";
import { api, errorMessage } from "@/lib/api";
import { useDashboard } from "@/lib/dashboard";
import { prepareSelfie } from "@/lib/media";
import { registerForPush } from "@/lib/push";
import { colors, moods } from "@/lib/theme";

export default function Checkin() {
  const { data, refresh } = useDashboard();
  const me = data?.members.find((member) => member.id === data.viewer.id);
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [retaking, setRetaking] = useState(!me?.checkedIn);
  const [mood, setMood] = useState(me?.mood ?? "sparkly");
  const [caption, setCaption] = useState(me?.caption ?? "");
  const [consent, setConsent] = useState(me?.consentTransform ?? true);
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!data?.circle || !data.today) return null;
  const circle = data.circle;
  const day = data.today;

  async function capture() {
    if (!camera.current || !ready) return;
    const picture = await camera.current.takePictureAsync({ quality: 0.9 });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhotoUri(picture.uri);
    setRetaking(false);
  }

  async function pickFromLibrary() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9, allowsEditing: true, aspect: [4, 5] });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setRetaking(false);
    }
  }

  async function save() {
    setBusy("save");
    setError(null);
    try {
      const form = new FormData();
      form.append("circleId", circle.id);
      form.append("day", day);
      form.append("mood", mood);
      form.append("caption", caption);
      form.append("consentTransform", String(consent));
      if (photoUri) {
        const uri = await prepareSelfie(photoUri);
        // React Native's FormData accepts file descriptors in place of Blobs.
        form.append("photo", { uri, name: "selfie.jpg", type: "image/jpeg" } as unknown as Blob);
      } else {
        throw new Error("Take a selfie first.");
      }
      await api("/api/checkins", { form });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await refresh();
      router.back();
      // Ask about notifications at the moment they're obviously useful.
      void registerForPush({ prompt: true });
    } catch (caught) {
      setError(errorMessage(caught, "Couldn’t save your selfie."));
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!(await confirm("Remove today’s selfie?", "It’s deleted from this circle right away.", "Remove"))) return;
    setBusy("delete");
    try {
      await api("/api/checkins", { method: "DELETE", body: { circleId: circle.id, day } });
      await refresh();
      router.back();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(null);
    }
  }

  const showCamera = retaking && !photoUri;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View>
              <Eyebrow>{circle.name}</Eyebrow>
              <Title style={{ fontSize: 32, marginTop: 4 }}>Today’s selfie</Title>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} hitSlop={12} style={styles.close}>
              <Text style={{ fontSize: 18, fontWeight: "900" }}>✕</Text>
            </Pressable>
          </View>

          <ErrorBanner message={error} onDismiss={() => setError(null)} />

          <View style={styles.frame}>
            {showCamera ? (
              permission?.granted ? (
                <CameraView
                  ref={camera}
                  style={StyleSheet.absoluteFill}
                  facing="front"
                  mirror
                  onCameraReady={() => setReady(true)}
                />
              ) : (
                <View style={styles.permission}>
                  <Body style={{ textAlign: "center", color: colors.cream }}>
                    Kinwhim needs the camera for your daily selfie. Photos are only shared with this circle.
                  </Body>
                  <Button label="Allow camera" variant="light" style={{ marginTop: 16 }} onPress={() => void requestPermission()} />
                </View>
              )
            ) : photoUri ? (
              <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : me?.photoUrl ? (
              <AuthImage path={me.photoUrl} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : null}
          </View>

          <View style={styles.captureRow}>
            {showCamera ? (
              <>
                <Button label="Library" variant="ghost" onPress={() => void pickFromLibrary()} style={{ flex: 1 }} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Take photo"
                  disabled={!ready}
                  onPress={() => void capture()}
                  style={[styles.shutter, !ready && { opacity: 0.4 }]}
                />
                <View style={{ flex: 1 }} />
              </>
            ) : (
              <Button label="Retake" variant="ghost" icon="↺" onPress={() => { setPhotoUri(null); setRetaking(true); }} style={{ flex: 1 }} />
            )}
          </View>

          <Eyebrow>Mood</Eyebrow>
          <View style={styles.chips}>
            {moods.map(([name, emoji]) => (
              <Chip key={name} label={`${emoji} ${name}`} selected={mood === name} onPress={() => setMood(name)} />
            ))}
          </View>

          <TextInput
            accessibilityLabel="Caption"
            value={caption}
            onChangeText={(value) => setCaption(value.slice(0, 120))}
            placeholder="A tiny note for the circle (optional)"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />

          <View style={styles.consent}>
            <View style={{ flex: 1 }}>
              <Text style={styles.consentTitle}>Transform my selfie with AI</Text>
              <Text style={styles.consentBody}>
                Sends this photo to our AI image provider to make tonight’s memory. Off means friends still see it, but it isn’t sent or
                used.
              </Text>
            </View>
            <Switch value={consent} onValueChange={setConsent} trackColor={{ true: colors.coral }} accessibilityLabel="Transform my selfie with AI" />
          </View>

          <Button
            label={me?.checkedIn && !photoUri ? "Take a new selfie to update" : "Check in"}
            busy={busy === "save"}
            disabled={!photoUri}
            onPress={() => void save()}
            style={{ marginTop: 8 }}
          />
          {me?.checkedIn && (
            <Button label="Remove today’s selfie" variant="ghost" busy={busy === "delete"} onPress={() => void remove()} style={{ marginTop: 10 }} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.paperDeep, alignItems: "center", justifyContent: "center" },
  frame: { aspectRatio: 0.8, borderRadius: 30, overflow: "hidden", backgroundColor: colors.ink },
  permission: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  captureRow: { flexDirection: "row", alignItems: "center", gap: 16, marginVertical: 18 },
  shutter: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.cream, borderWidth: 6, borderColor: colors.coral },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10, marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.ink,
  },
  consent: { flexDirection: "row", gap: 12, alignItems: "center", marginVertical: 18, padding: 16, borderRadius: 20, backgroundColor: colors.paperDeep },
  consentTitle: { fontWeight: "900", fontSize: 15, color: colors.ink },
  consentBody: { marginTop: 4, fontSize: 13, lineHeight: 18, color: colors.inkSoft },
});
