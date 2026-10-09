import { File, Paths } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
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
  // Write-only access: Kinwhim never reads your photo library to save.
  const permission = await MediaLibrary.requestPermissionsAsync(true, ["photo"]);
  if (!permission.granted) {
    throw new Error("Allow Kinwhim to add photos in Settings to save memories.");
  }
  await MediaLibrary.Asset.create(localUri);
}

export async function shareImage(localUri: string) {
  if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing isn’t available on this device.");
  await Sharing.shareAsync(localUri, {
    mimeType: "image/png",
    UTI: "public.png",
    dialogTitle: "Share this Kinwhim memory",
  });
}

// Selfies are resized before upload: faster on cellular and plenty for the AI.
export async function prepareSelfie(uri: string) {
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: 1280 });
  const image = await context.renderAsync();
  const result = await image.saveAsync({ compress: 0.82, format: SaveFormat.JPEG });
  return result.uri;
}
