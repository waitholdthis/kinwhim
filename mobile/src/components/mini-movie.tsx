import * as Haptics from "expo-haptics";
import { useVideoPlayer, VideoView } from "expo-video";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { Body, Button, Card, Eyebrow } from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { makeMiniMovie, saveToPhotos, shareMovie } from "@/lib/media";
import { colors, fonts } from "@/lib/theme";

// "Make it move": renders the memory into a six-second MP4 on the device.
export function MiniMovie({ mediaUrl, day }: { mediaUrl: string; day: string }) {
  const [progress, setProgress] = useState<number | null>(null);
  const [movieUri, setMovieUri] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "share" | null>(null);

  async function make() {
    setProgress(0);
    try {
      const uri = await makeMiniMovie(mediaUrl, day, setProgress);
      setMovieUri(uri);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (caught) {
      Alert.alert("Couldn’t make the movie", errorMessage(caught));
    } finally {
      setProgress(null);
    }
  }

  async function run(kind: "save" | "share") {
    if (!movieUri) return;
    setBusy(kind);
    try {
      if (kind === "save") {
        await saveToPhotos(movieUri);
        Alert.alert("Saved to Photos", "Your mini movie is in your library.");
      } else {
        await shareMovie(movieUri);
      }
    } catch (caught) {
      Alert.alert(kind === "save" ? "Couldn’t save" : "Couldn’t share", errorMessage(caught));
    } finally {
      setBusy(null);
    }
  }

  const rendering = progress !== null;
  return (
    <Card style={styles.card}>
      <Eyebrow color={colors.ink}>Make it move</Eyebrow>
      <Text style={styles.title}>A six-second mini movie</Text>
      <Body style={{ fontSize: 14, marginTop: 4 }}>A slow cinematic drift and a little confetti, ready for Messages or your story.</Body>
      {movieUri && !rendering && <MoviePreview uri={movieUri} />}
      <Button
        label={rendering ? `Rendering ${Math.round((progress ?? 0) * 100)}%` : movieUri ? "Remake mini movie" : "Make mini movie"}
        icon="🎬"
        busy={false}
        disabled={rendering}
        onPress={() => void make()}
        style={{ marginTop: 14 }}
      />
      {movieUri && !rendering && (
        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          <Button label="Save video" icon="⤓" variant="ghost" busy={busy === "save"} onPress={() => void run("save")} style={{ flex: 1 }} />
          <Button label="Share video" icon="↗" variant="ghost" busy={busy === "share"} onPress={() => void run("share")} style={{ flex: 1 }} />
        </View>
      )}
    </Card>
  );
}

function MoviePreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = true;
    instance.muted = true;
    instance.play();
  });
  return <VideoView player={player} nativeControls={false} contentFit="cover" style={styles.video} accessibilityLabel="Mini movie preview" />;
}

const styles = StyleSheet.create({
  card: { marginTop: 20, backgroundColor: colors.butter },
  title: { fontFamily: fonts.serif, fontSize: 24, fontWeight: "900", color: colors.ink, marginTop: 6 },
  video: { marginTop: 14, width: "100%", aspectRatio: 1, borderRadius: 20, overflow: "hidden", backgroundColor: colors.ink },
});
