import { router } from "expo-router";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthImage, Body, Eyebrow, Title } from "@/components/ui";
import { useDashboard } from "@/lib/dashboard";
import { prettyDate } from "@/lib/format";
import { colors, fonts } from "@/lib/theme";

export default function Memories() {
  const { data, refresh } = useDashboard();
  const memories = data?.memories ?? [];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={["top"]}>
      <FlatList
        data={memories}
        keyExtractor={(memory) => memory.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ padding: 20, gap: 12 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => void refresh()} />}
        ListHeaderComponent={
          <View style={{ marginBottom: 8 }}>
            <Eyebrow>{data?.circle?.name ?? "Kinwhim"}</Eyebrow>
            <Title style={{ marginTop: 6 }}>{memories.length} little worlds</Title>
          </View>
        }
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
  item: { flex: 1, maxWidth: "50%" },
  image: { aspectRatio: 1, borderRadius: 22, backgroundColor: colors.paperDeep },
  dot: { position: "absolute", top: 10, right: 10, width: 14, height: 14, borderRadius: 7, backgroundColor: colors.coral, borderWidth: 2, borderColor: colors.cream },
  title: { marginTop: 8, fontFamily: fonts.serif, fontWeight: "900", fontSize: 16, color: colors.ink },
  day: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
