import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider, useSession } from "@/lib/session";
import { colors } from "@/lib/theme";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <StatusBar style="dark" />
        <SplashGate />
        <NotificationRouter />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}>
          <Stack.Screen name="email" options={{ presentation: "modal" }} />
        </Stack>
      </SessionProvider>
    </SafeAreaProvider>
  );
}

function SplashGate() {
  const { status } = useSession();
  useEffect(() => {
    if (status !== "loading") void SplashScreen.hideAsync();
  }, [status]);
  return null;
}

// Tapping a notification opens what it is about: a new memory, today’s
// check-in (reminders), or the memory shelf (weekly recap).
function NotificationRouter() {
  const { status } = useSession();
  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (status !== "signedIn" || !response) return;
    if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const data = response.notification.request.content.data as { memoryId?: string; circleId?: string; screen?: string };
    const circle = data.circleId ?? "";
    if (data.memoryId) {
      router.push({ pathname: "/memory/[id]", params: { id: data.memoryId, circle } });
    } else if (data.screen === "checkin") {
      router.push({ pathname: "/today", params: { circle, open: "checkin" } });
    } else if (data.screen === "memories") {
      router.push({ pathname: "/memories", params: { circle } });
    }
    void Notifications.clearLastNotificationResponseAsync();
  }, [response, status]);
  return null;
}
