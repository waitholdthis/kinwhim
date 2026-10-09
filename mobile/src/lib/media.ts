import { File, Paths } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { renderMiniMovie } from "../../modules/kinwhim-movie";
import { absoluteUrl, authHeaders } from "@/lib/api";

// Memory images are private, so fetch them with the session and keep a local
// copy that Photos and the share sheet can read.
export async function downloadMemory(mediaUrl: string, day: string) {
  const response = await fetch(absoluteUrl(mediaUrl), { headers: authHeaders() });
  if (!response.ok) throw new Error("Couldn’t download this memory.");
  const file = new File(Paths.cache, `kinwhim-${day}.png`);
  if (file.exists) file.delete();
  file.create({ intermediates: true });
  file.write(new Uint8Array(await response.arrayBuffer()));
  return file.uri;
}

export async function saveToPhotos(localUri: string) {
  // iOS asks for add-only access. Android 10+ writes to MediaStore without any
  // permission, and Kinwhim never asks to read the library.
  const needsPermission = Platform.OS === "ios" || Number(Platform.Version) < 29;
  if (needsPermission) {
    const permission = await MediaLibrary.requestPermissionsAsync(true, ["photo"]);
    if (!permission.granted) {
      throw new Error("Allow Kinwhim to add photos in Settings to save memories.");
    }
  }
  await MediaLibrary.Asset.create(localUri);
}

export async function shareImage(localUri: string) {
  await shareFile(localUri, "image/png", "public.png");
}

export async function shareMovie(localUri: string) {
  await shareFile(localUri, "video/mp4", "public.mpeg-4");
}

async function shareFile(localUri: string, mimeType: string, UTI: string) {
  if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing isn’t available on this device.");
  await Sharing.shareAsync(localUri, { mimeType, UTI, dialogTitle: "Share this Kinwhim memory" });
}

// Six seconds of slow drift and confetti over the memory, as an MP4 that
// Photos, Messages, and social apps all accept.
export async function makeMiniMovie(mediaUrl: string, day: string, onProgress: (progress: number) => void) {
  const imageUri = await downloadMemory(mediaUrl, day);
  const output = new File(Paths.cache, `kinwhim-${day}.mp4`);
  return renderMiniMovie(imageUri, output.uri, { size: 720, durationMs: 6000, onProgress });
}

// Selfies are resized before upload: faster on cellular and plenty for the AI.
export async function prepareSelfie(uri: string) {
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: 1280 });
  const image = await context.renderAsync();
  const result = await image.saveAsync({ compress: 0.82, format: SaveFormat.JPEG });
  return result.uri;
}
