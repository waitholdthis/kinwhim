import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { api, platform } from "@/lib/api";

let registeredToken: string | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function currentPushToken() {
  return registeredToken;
}

// Asks for notification permission (once) and sends the Expo push token to
// Kinwhim so we can say when tonight's memory is ready.
export async function registerForPush({ prompt }: { prompt: boolean }) {
  if (!Device.isDevice) return null;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("memories", {
      name: "Memories",
      description: "When your circle’s nightly memory is ready",
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: "#EF8354",
    });
  }
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && prompt && permission.canAskAgain) {
    permission = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
  }
  if (!permission.granted) return null;

  const projectId =
    (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId ??
    Constants.easConfig?.projectId;
  try {
    const { data } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    if (data !== registeredToken) {
      await api("/api/push", { body: { token: data, platform } });
      registeredToken = data;
    }
    return data;
  } catch (error) {
    console.warn("Push registration failed", error);
    return null;
  }
}

export async function setBadge(count: number) {
  try {
    await Notifications.setBadgeCountAsync(Math.max(0, count));
  } catch {
    // Badges are best effort; iOS refuses without badge permission.
  }
}

export function forgetPushToken() {
  registeredToken = null;
}
