import { env } from "cloudflare:workers";
import { database } from "@/lib/kinwhim-server";

type PushMessage = {
  title: string;
  body: string;
  // Opened by the app when the notification is tapped, e.g. { url: "kinwhim://memory/<id>" }.
  data?: Record<string, string>;
};

// Unread memories across every circle the person belongs to, minus anything
// they reported. This drives the home-screen badge.
export async function unreadCountFor(userId: string) {
  const row = await database()
    .prepare(
      `SELECT COUNT(*) AS count
       FROM memories m
       INNER JOIN circle_members cm ON cm.circle_id = m.circle_id AND cm.user_id = ?
       WHERE NOT EXISTS (SELECT 1 FROM notification_reads nr WHERE nr.memory_id = m.id AND nr.user_id = ?)
         AND NOT EXISTS (SELECT 1 FROM reports r WHERE r.target_type = 'memory' AND r.target_id = m.id AND r.reporter_id = ?)
         AND m.created_at >= cm.joined_at`,
    )
    .bind(userId, userId, userId)
    .first<{ count: number }>();
  return Number(row?.count ?? 0);
}

export async function sendPush(userIds: string[], message: PushMessage) {
  if (!userIds.length) return;
  const db = database();
  const placeholders = userIds.map(() => "?").join(",");
  const tokens = await db
    .prepare(`SELECT user_id AS userId, token FROM push_tokens WHERE user_id IN (${placeholders})`)
    .bind(...userIds)
    .all<{ userId: string; token: string }>();
  if (!tokens.results.length) return;

  const badges = new Map<string, number>();
  for (const userId of new Set(tokens.results.map((row) => row.userId))) {
    badges.set(userId, await unreadCountFor(userId));
  }
  const messages = tokens.results.map((row) => ({
    to: row.token,
    title: message.title,
    body: message.body,
    data: message.data,
    sound: "default",
    badge: badges.get(row.userId) ?? 0,
  }));

  for (let index = 0; index < messages.length; index += 100) {
    const batch = messages.slice(index, index + 100);
    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          ...(env.EXPO_ACCESS_TOKEN ? { authorization: `Bearer ${env.EXPO_ACCESS_TOKEN}` } : {}),
        },
        body: JSON.stringify(batch),
      });
      const result = (await response.json()) as {
        data?: Array<{ status: string; details?: { error?: string } }>;
      };
      // Forget tokens for uninstalled apps so we stop sending to them.
      const stale = (result.data ?? [])
        .map((ticket, ticketIndex) =>
          ticket.details?.error === "DeviceNotRegistered" ? batch[ticketIndex]?.to : null,
        )
        .filter((token): token is string => Boolean(token));
      for (const token of stale) {
        await db.prepare("DELETE FROM push_tokens WHERE token = ?").bind(token).run();
      }
    } catch (error) {
      console.error("Push send failed", error);
    }
  }
}
