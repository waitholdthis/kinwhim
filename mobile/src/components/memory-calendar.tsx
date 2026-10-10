import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AuthImage, ErrorBanner } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { colors, fonts } from "@/lib/theme";
import type { Memory } from "@/lib/types";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

// A month grid of the circle's memories, loaded a month at a time so older
// worlds stay reachable.
export function MemoryCalendar({ circleId, initialMonth }: { circleId: string; initialMonth: string }) {
  const [month, setMonth] = useState(initialMonth);
  const [loaded, setLoaded] = useState<{ month: string; memories: Memory[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ memories: Memory[] }>(`/api/memories?circle=${encodeURIComponent(circleId)}&month=${month}`).then(
      (result) => {
        setLoaded({ month, memories: result.memories });
        setError(null);
      },
      (caught: unknown) => setError(errorMessage(caught, "Couldn’t load this month.")),
    );
  }, [circleId, month]);

  const [year, monthNumber] = month.split("-").map(Number);
  const leading = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const byDay = new Map((loaded?.month === month ? loaded.memories : []).map((memory) => [memory.day, memory]));
  const label = new Date(Date.UTC(year, monthNumber - 1, 1)).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const shift = (amount: number) => {
    const next = new Date(Date.UTC(year, monthNumber - 1 + amount, 1));
    setMonth(`${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`);
  };
  const cells: { key: string; day?: string; date?: number }[] = [
    ...Array.from({ length: leading }, (_, index) => ({ key: `blank-${index}` })),
    ...Array.from({ length: daysInMonth }, (_, index) => ({
      key: `day-${index}`,
      day: `${month}-${String(index + 1).padStart(2, "0")}`,
      date: index + 1,
    })),
  ];

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => shift(-1)} style={styles.arrow}>
          <Text style={styles.arrowText}>‹</Text>
        </Pressable>
        <Text style={styles.month}>{label}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => shift(1)} style={styles.arrow}>
          <Text style={styles.arrowText}>›</Text>
        </Pressable>
      </View>
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <View style={styles.grid}>
        {WEEKDAYS.map((weekday, index) => (
          <Text key={`weekday-${index}`} style={[styles.cell, styles.weekday]}>{weekday}</Text>
        ))}
        {cells.map((cell) => {
          const memory = cell.day ? byDay.get(cell.day) : undefined;
          if (!cell.day) return <View key={cell.key} style={styles.cell} />;
          return memory ? (
            <Pressable
              key={cell.key}
              accessibilityRole="button"
              accessibilityLabel={`${memory.title}, ${cell.day}`}
              onPress={() => router.push({ pathname: "/memory/[id]", params: { id: memory.id } })}
              style={styles.cell}
            >
              <AuthImage path={memory.mediaUrl} style={styles.thumb} contentFit="cover" />
              <Text style={styles.badge}>{cell.date}</Text>
            </Pressable>
          ) : (
            <View key={cell.key} style={styles.cell}>
              <View style={styles.empty}>
                <Text style={styles.emptyText}>{cell.date}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 26, backgroundColor: "rgba(255,255,255,0.6)", padding: 14 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  arrow: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.paperDeep, alignItems: "center", justifyContent: "center" },
  arrowText: { fontSize: 22, fontWeight: "900", color: colors.ink },
  month: { fontFamily: fonts.serif, fontSize: 22, fontWeight: "900", color: colors.ink },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
  weekday: { aspectRatio: undefined, textAlign: "center", fontSize: 11, fontWeight: "900", color: colors.muted, paddingBottom: 6 },
  thumb: { flex: 1, borderRadius: 10, backgroundColor: colors.paperDeep },
  badge: {
    position: "absolute",
    left: 5,
    bottom: 5,
    overflow: "hidden",
    borderRadius: 5,
    paddingHorizontal: 3,
    fontSize: 10,
    color: "#fff",
    backgroundColor: "rgba(36,33,23,0.7)",
  },
  empty: { flex: 1, borderRadius: 10, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 12, color: colors.muted },
});
