import { NativeModule, requireNativeModule } from "expo";

type Events = {
  onProgress: (event: { progress: number }) => void;
};

declare class KinwhimMovieModule extends NativeModule<Events> {
  renderMovie(imageUri: string, outputUri: string, size: number, durationMs: number): Promise<string>;
}

export default requireNativeModule<KinwhimMovieModule>("KinwhimMovie");
