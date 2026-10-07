import {
  database,
  jsonError,
  mediaUrl,
  requireViewer,
  upsertProfile,
} from "@/lib/kinwhim-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const viewer = await requireViewer();
    await upsertProfile(viewer);
    const db = database();
    const url = new URL(request.url);
    const requestedCircle = url.searchParams.get("circle");

    const circleRows = await db
      .prepare(
        `SELECT c.id, c.name, c.invite_code AS inviteCode, c.owner_id AS ownerId,
                c.reveal_hour AS revealHour, c.timezone, c.style
         FROM circles c
         INNER JOIN circle_members cm ON cm.circle_id = c.id
         WHERE cm.user_id = ?
         ORDER BY c.created_at ASC`,
      )
      .bind(viewer.id)
      .all<Record<string, string | number>>();
    const circles = circleRows.results;
    const selected =
      circles.find((circle) => circle.id === requestedCircle) ?? circles[0] ?? null;

    if (!selected) {
      return Response.json({ viewer, circles: [], circle: null, members: [], memories: [] });
    }

    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: String(selected.timezone),
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const memberRows = await db
      .prepare(
        `SELECT p.id, p.display_name AS name, p.email, cm.role,
                ci.photo_key AS photoKey, ci.mood, ci.caption,
                ci.consent_transform AS consentTransform
         FROM circle_members cm
         INNER JOIN profiles p ON p.id = cm.user_id
         LEFT JOIN checkins ci
           ON ci.circle_id = cm.circle_id AND ci.user_id = cm.user_id AND ci.day = ?
         WHERE cm.circle_id = ?
         ORDER BY cm.joined_at ASC`,
      )
      .bind(today, selected.id)
      .all<Record<string, string | number | null>>();

    const memoryRows = await db
      .prepare(
        `SELECT m.id, m.day, m.media_key AS mediaKey, m.kind, m.title, m.created_at AS createdAt,
                GROUP_CONCAT(r.emoji) AS reactions
         FROM memories m
         LEFT JOIN reactions r ON r.memory_id = m.id
         WHERE m.circle_id = ?
         GROUP BY m.id
         ORDER BY m.day DESC
         LIMIT 20`,
      )
      .bind(selected.id)
      .all<Record<string, string | number | null>>();

    return Response.json({
      viewer,
      circles,
      circle: selected,
      today,
      members: memberRows.results.map((member) => ({
        ...member,
        checkedIn: Boolean(member.photoKey),
        photoUrl: mediaUrl(member.photoKey ? String(member.photoKey) : null),
        consentTransform: Boolean(member.consentTransform),
      })),
      memories: memoryRows.results.map((memory) => ({
        ...memory,
        mediaUrl: mediaUrl(String(memory.mediaKey)),
        reactions: memory.reactions ? String(memory.reactions).split(",") : [],
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}
