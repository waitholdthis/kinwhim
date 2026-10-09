import { router } from "expo-router";
import { Alert } from "react-native";
import { confirm, showActions, type SheetOption } from "@/lib/actions";
import { api, errorMessage } from "@/lib/api";
import type { Circle, Member } from "@/lib/types";

type Context = {
  member: Member;
  circle: Circle;
  viewerId: string;
  refresh: () => Promise<unknown>;
  includePhoto?: boolean;
};

export function openMemberActions({ member, circle, viewerId, refresh, includePhoto }: Context) {
  if (member.id === viewerId) return;
  const isKeeper = circle.ownerId === viewerId;
  const options: SheetOption[] = [];

  if (includePhoto && member.checkinId) {
    options.push({
      label: "Report this photo",
      destructive: true,
      onPress: () =>
        router.push({
          pathname: "/report",
          params: { targetType: "photo", targetId: member.checkinId!, userId: member.id, label: `${member.name}’s selfie` },
        }),
    });
  }
  options.push({
    label: `Report ${member.name}`,
    destructive: true,
    onPress: () =>
      router.push({ pathname: "/report", params: { targetType: "user", targetId: member.id, userId: member.id, label: member.name } }),
  });
  options.push(
    member.blocked
      ? {
          label: `Unblock ${member.name}`,
          onPress: () => void run(() => api("/api/blocks", { method: "DELETE", body: { userId: member.id } }), refresh),
        }
      : {
          label: `Block ${member.name}`,
          destructive: true,
          onPress: async () => {
            const ok = await confirm(
              `Block ${member.name}?`,
              "You won’t see each other’s selfies, and you won’t appear together in new memories. They aren’t notified.",
              "Block",
            );
            if (ok) await run(() => api("/api/blocks", { body: { userId: member.id } }), refresh);
          },
        },
  );
  if (isKeeper) {
    options.push({
      label: "Remove from circle",
      destructive: true,
      onPress: async () => {
        const ok = await confirm(
          `Remove ${member.name}?`,
          "Their selfies in this circle are deleted and the invite code is reset so the old one stops working.",
          "Remove",
        );
        if (ok) {
          await run(() => api("/api/circles/members", { method: "DELETE", body: { circleId: circle.id, userId: member.id } }), refresh);
        }
      },
    });
  }
  showActions(member.name, options);
}

async function run(action: () => Promise<unknown>, refresh: () => Promise<unknown>) {
  try {
    await action();
    await refresh();
  } catch (error) {
    Alert.alert("That didn’t work", errorMessage(error));
  }
}
