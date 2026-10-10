import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MemoryCalendar } from "@/components/memory-calendar";
import { AuthImage, Body, Chip, Eyebrow, Title } from "@/components/ui";
import { useDashboard } from "@/lib/dashboard";
import { prettyDate } from "@/lib/format";
import { colors, fonts } from "@/lib/theme";

export default function Memories() {
  const { data, refresh, circleId, selectCircle } = useDashboard();
  const params = useLocalSearchParams<{ circle?: string }>();
  const [view, setView] = useState<"grid" | "calendar">("grid");
  const memories = data?.memories ?? [];

  // Arriving from a weekly recap for another circle.
  useEffect(() => {
    if (params.circle && params.circle !== circleId) void selectCircle(params.circle);
  }, [params.circle, circleId, selectCircle]);

  const header = (
    <View style={{ marginBottom: 8 }}>
      <Eyebrow>{data?.circle?.name ?? "Kinwhim"}</Eyebrow>
      <Title style={{ marginTop: 6 }}>{memories.length} little worlds</Title>
      <View style={styles.toggle}>
        <Chip label="Grid" selected={view === "grid"} onPress={() => setView("grid")} />
        <Chip label="Calendar" selected={view === "calendar"} onPress={() => setView("calendar")} />
      </View>
    </View>
  );

  if (view === "calendar" && data?.circle) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={["top"]}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          {header}
          <MemoryCalendar
            key={data.circle.id}
            circleId={data.circle.id}
            initialMonth={(memories[0]?.day ?? data.today ?? new Date().toISOString()).slice(0, 7)}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={["top"]}>
      <FlatList
        data={memories}
        keyExtractor={(memory) => memory.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ padding: 20, gap: 12 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => void refresh()} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <Body style={{ marginTop: 20 }}>Your first shared memory lands here after everyone checks in and the reveal time passes.</Body>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.title}, ${item.day}${item.isRead ? "" : ", new"}`}
            onPress={() => router.push({ pathname: "/memory/[id]", params: { id: item.id } })}
            style={styles.item}
          >
            <AuthImage path={item.mediaUrl} style={styles.image} contentFit="cover" />
            {!item.isRead && <View style={styles.dot} />}
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.day}>{prettyDate(item.day)}</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: "row", gap: 8, marginTop: 14, marginBottom: 6 },
  item: { flex: 1, maxWidth: "50%" },
  image: { aspectRatio: 1, borderRadius: 22, backgroundColor: colors.paperDeep },
  dot: { position: "absolute", top: 10, right: 10, width: 14, height: 14, borderRadius: 7, backgroundColor: colors.coral, borderWidth: 2, borderColor: colors.cream },
  title: { marginTop: 8, fontFamily: fonts.serif, fontWeight: "900", fontSize: 16, color: colors.ink },
  day: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
