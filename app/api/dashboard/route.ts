import {
  blockedUserIds,
  database,
  jsonError,
  mediaUrl,
  publicOrigin,
  requireViewer,
} from "@/lib/kinwhim-server";
import { CURRENT_TERMS_VERSION } from "@/lib/policies";
import { listMemories, streaksFor } from "@/lib/memories";
import { unreadCountFor } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const viewer = await requireViewer();
    const db = database();
    const url = new URL(request.url);
    const requestedCircle = url.searchParams.get("circle");
    const viewerSummary = {
      id: viewer.id,
      name: viewer.name,
      email: viewer.email,
      needsTerms: viewer.termsVersion !== CURRENT_TERMS_VERSION,
      remindersEnabled: true,
    };
    const preferences = await db
      .prepare("SELECT reminders_enabled AS remindersEnabled FROM profiles WHERE id = ?")
      .bind(viewer.id)
      .first<{ remindersEnabled: number }>();
    viewerSummary.remindersEnabled = Boolean(preferences?.remindersEnabled ?? 1);

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
    const badgeCount = await unreadCountFor(viewer.id);

    if (!selected) {
      return Response.json({
        viewer: viewerSummary,
        circles: [],
        circle: null,
        members: [],
        memories: [],
        unreadCount: 0,
        streaks: { circle: 0, mine: 0 },
        badgeCount,
        termsVersion: CURRENT_TERMS_VERSION,
      });
    }

    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: String(selected.timezone),
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const blocked = await blockedUserIds(viewer.id);

    const memberRows = await db
      .prepare(
        `SELECT p.id, p.display_name AS name, cm.role,
                ci.id AS checkinId, ci.photo_key AS photoKey, ci.mood, ci.caption,
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

    const memories = await listMemories({ viewerId: viewer.id, circleId: String(selected.id), limit: 30 });
    const streaks = await streaksFor(viewer.id, String(selected.id), today);

    return Response.json({
      viewer: viewerSummary,
      circles,
      circle: {
        ...selected,
        inviteUrl: `${publicOrigin(request)}/join/${encodeURIComponent(String(selected.inviteCode))}`,
      },
      today,
      members: memberRows.results.map((member) => {
        const isBlocked = blocked.has(String(member.id));
        return {
          id: member.id,
          name: member.name,
          role: member.role,
          checkinId: isBlocked ? null : member.checkinId,
          checkedIn: Boolean(member.photoKey),
          photoUrl: isBlocked ? null : mediaUrl(member.photoKey ? String(member.photoKey) : null),
          mood: member.mood,
          caption: isBlocked ? null : member.caption,
          consentTransform: Boolean(member.consentTransform),
          blocked: isBlocked,
        };
      }),
      memories,
      unreadCount: memories.filter((memory) => !memory.isRead).length,
      streaks,
      badgeCount,
      termsVersion: CURRENT_TERMS_VERSION,
    });
  } catch (error) {
    return jsonError(error);
  }
}
