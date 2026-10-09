import { Redirect, Stack } from "expo-router";
import { useEffect } from "react";
import { DashboardProvider } from "@/lib/dashboard";
import { registerForPush } from "@/lib/push";
import { useSession } from "@/lib/session";
import { colors, fonts } from "@/lib/theme";

export default function SignedInLayout() {
  const { status } = useSession();

  // Re-register quietly if notifications were already allowed; the first
  // prompt waits until after someone's first check-in.
  useEffect(() => {
    if (status === "signedIn") void registerForPush({ prompt: false });
  }, [status]);

  if (status === "loading") return null;
  if (status === "signedOut") return <Redirect href="/sign-in" />;

  return (
    <DashboardProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.paper },
          headerStyle: { backgroundColor: colors.paper },
          headerTintColor: colors.ink,
          headerTitleStyle: { fontFamily: fonts.serif, fontWeight: "900" },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="checkin" options={{ presentation: "fullScreenModal" }} />
        <Stack.Screen name="terms" options={{ presentation: "modal" }} />
        <Stack.Screen name="report" options={{ presentation: "modal" }} />
        <Stack.Screen name="new-circle" options={{ presentation: "modal" }} />
        <Stack.Screen name="memory/[id]" options={{ headerShown: true, title: "" }} />
        <Stack.Screen name="settings" options={{ headerShown: true, title: "Settings" }} />
        <Stack.Screen name="blocked" options={{ headerShown: true, title: "Blocked people" }} />
        <Stack.Screen name="circle-settings" options={{ headerShown: true, title: "Circle settings" }} />
      </Stack>
    </DashboardProvider>
  );
}
