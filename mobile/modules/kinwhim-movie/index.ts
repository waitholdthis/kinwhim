import KinwhimMovie from "./src/KinwhimMovieModule";

// Renders a memory image (a local file:// URI) into a square H.264 MP4 with the
// same drift-and-confetti animation as the web app's mini movie.
export async function renderMiniMovie(
  imageUri: string,
  outputUri: string,
  { size = 720, durationMs = 6000, onProgress }: { size?: number; durationMs?: number; onProgress?: (progress: number) => void } = {},
) {
  const subscription = onProgress
    ? KinwhimMovie.addListener("onProgress", ({ progress }) => onProgress(progress))
    : null;
  try {
    return await KinwhimMovie.renderMovie(imageUri, outputUri, size, durationMs);
  } finally {
    subscription?.remove();
  }
}
