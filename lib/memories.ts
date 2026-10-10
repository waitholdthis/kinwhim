import { database, mediaUrl } from "@/lib/kinwhim-server";
import { streakLength } from "@/lib/time";

type MemoryRow = {
  id: string;
  day: string;
  mediaKey: string;
  kind: string;
  title: string;
  createdAt: number;
  reactions: string | null;
  isRead: number;
  featuresViewer: number;
};

// Memories as a circle member sees them: newest first, with reactions and
// read state, and without anything the viewer has reported.
export async function listMemories(options: {
  viewerId: string;
  circleId: string;
  from?: string;
  to?: string;
  memoryId?: string;
  limit?: number;
}) {
  const filters = ["m.circle_id = ?"];
  const binds: unknown[] = [options.viewerId, options.viewerId, options.circleId];
  if (options.from) {
    filters.push("m.day >= ?");
    binds.push(options.from);
  }
  if (options.to) {
    filters.push("m.day <= ?");
    binds.push(options.to);
  }
  if (options.memoryId) {
    filters.push("m.id = ?");
    binds.push(options.memoryId);
  }
  binds.push(options.viewerId, options.limit ?? 30);

  const rows = await database()
    .prepare(
      `SELECT m.id, m.day, m.media_key AS mediaKey, m.kind, m.title, m.created_at AS createdAt,
              GROUP_CONCAT(r.emoji) AS reactions,
              CASE WHEN EXISTS (
                SELECT 1 FROM notification_reads nr WHERE nr.memory_id = m.id AND nr.user_id = ?
              ) THEN 1 ELSE 0 END AS isRead,
              CASE WHEN EXISTS (
                SELECT 1 FROM memory_participants mp WHERE mp.memory_id = m.id AND mp.user_id = ?
              ) THEN 1 ELSE 0 END AS featuresViewer
       FROM memories m
       LEFT JOIN reactions r ON r.memory_id = m.id
       WHERE ${filters.join(" AND ")}
         AND NOT EXISTS (
           SELECT 1 FROM reports rp
           WHERE rp.target_type = 'memory' AND rp.target_id = m.id AND rp.reporter_id = ?
         )
       GROUP BY m.id
       ORDER BY m.day DESC
       LIMIT ?`,
    )
    .bind(...binds)
    .all<MemoryRow>();

  return rows.results.map((memory) => ({
    id: memory.id,
    day: memory.day,
    kind: memory.kind,
    title: memory.title,
    createdAt: memory.createdAt,
    mediaUrl: mediaUrl(memory.mediaKey)!,
    reactions: memory.reactions ? memory.reactions.split(",") : [],
    isRead: Boolean(memory.isRead),
    featuresViewer: Boolean(memory.featuresViewer),
  }));
}

// The circle's streak counts days that produced a memory; yours counts days
// you checked in.
export async function streaksFor(viewerId: string, circleId: string, today: string) {
  const db = database();
  const [memoryDays, checkinDays] = await Promise.all([
    db
      .prepare("SELECT day FROM memories WHERE circle_id = ? ORDER BY day DESC LIMIT 400")
      .bind(circleId)
      .all<{ day: string }>(),
    db
      .prepare("SELECT day FROM checkin_log WHERE circle_id = ? AND user_id = ? ORDER BY day DESC LIMIT 400")
      .bind(circleId, viewerId)
      .all<{ day: string }>(),
  ]);
  return {
    circle: streakLength(memoryDays.results.map((row) => row.day), today),
    mine: streakLength(checkinDays.results.map((row) => row.day), today),
  };
}
