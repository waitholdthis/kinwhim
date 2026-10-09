import { Tabs } from "expo-router";
import { type ColorValue, Text } from "react-native";
import { useDashboard } from "@/lib/dashboard";
import { colors } from "@/lib/theme";

function TabIcon({ glyph, color }: { glyph: string; color: ColorValue }) {
  return <Text style={{ fontSize: 20, color }}>{glyph}</Text>;
}

export default function TabsLayout() {
  const { data } = useDashboard();
  const unread = data?.unreadCount ?? 0;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.cream,
        tabBarInactiveTintColor: "rgba(255,248,232,0.55)",
        tabBarStyle: { backgroundColor: colors.ink, borderTopWidth: 0 },
        tabBarLabelStyle: { fontWeight: "800" },
        sceneStyle: { backgroundColor: colors.paper },
      }}
    >
      <Tabs.Screen name="today" options={{ title: "Today", tabBarIcon: ({ color }) => <TabIcon glyph="✦" color={color} /> }} />
      <Tabs.Screen
        name="memories"
        options={{
          title: "Memories",
          tabBarIcon: ({ color }) => <TabIcon glyph="▦" color={color} />,
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.coral, color: colors.ink },
        }}
      />
      <Tabs.Screen name="circle" options={{ title: "Circle", tabBarIcon: ({ color }) => <TabIcon glyph="◎" color={color} /> }} />
    </Tabs>
  );
}
