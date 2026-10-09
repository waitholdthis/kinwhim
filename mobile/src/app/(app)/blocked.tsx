import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { Body, Button } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useDashboard } from "@/lib/dashboard";
import { colors } from "@/lib/theme";

type Blocked = { id: string; name: string; createdAt: number };

export default function BlockedPeople() {
  const { refresh } = useDashboard();
  const [blocked, setBlocked] = useState<Blocked[] | null>(null);

  const load = useCallback(
    () =>
      api<{ blocked: Blocked[] }>("/api/blocks").then(
        (result) => setBlocked(result.blocked),
        (caught: unknown) => {
          Alert.alert("Couldn’t load", errorMessage(caught));
          setBlocked([]);
        },
      ),
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function unblock(person: Blocked) {
    try {
      await api("/api/blocks", { method: "DELETE", body: { userId: person.id } });
      await Promise.all([load(), refresh()]);
    } catch (caught) {
      Alert.alert("Couldn’t unblock", errorMessage(caught));
    }
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.paper }}
      contentContainerStyle={{ padding: 20 }}
      data={blocked ?? []}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <Body style={{ marginBottom: 12, fontSize: 14 }}>
          Blocked people can’t see your selfies, you can’t see theirs, and you won’t appear together in new memories.
        </Body>
      }
      ListEmptyComponent={blocked ? <Body>You haven’t blocked anyone.</Body> : null}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.name}>{item.name}</Text>
          <Button label="Unblock" variant="ghost" onPress={() => void unblock(item)} style={{ minHeight: 40 }} />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  name: { fontSize: 16, fontWeight: "800", color: colors.ink },
});
