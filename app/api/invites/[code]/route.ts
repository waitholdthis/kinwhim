import { normalizeInviteCode } from "@/lib/invites";
import { database, jsonError, requireViewer } from "@/lib/kinwhim-server";
import { allow, tooMany } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// Lets the app show "Join <circle>?" before someone commits.
export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  try {
    const viewer = await requireViewer();
    if (!(await allow(`invite-peek:${viewer.id}`, 30, 60 * 60))) return tooMany();
    const code = normalizeInviteCode((await context.params).code);
    const circle = code
      ? await database()
          .prepare(
            `SELECT c.id, c.name, p.display_name AS keeperName,
                    (SELECT COUNT(*) FROM circle_members WHERE circle_id = c.id) AS memberCount,
                    EXISTS (SELECT 1 FROM circle_members WHERE circle_id = c.id AND user_id = ?) AS alreadyMember
             FROM circles c LEFT JOIN profiles p ON p.id = c.owner_id
             WHERE c.invite_code = ? LIMIT 1`,
          )
          .bind(viewer.id, code)
          .first<{ id: string; name: string; keeperName: string | null; memberCount: number; alreadyMember: number }>()
      : null;
    if (!circle) return Response.json({ error: "That invite has expired or was reset." }, { status: 404 });
    return Response.json({
      circle: {
        id: circle.id,
        name: circle.name,
        keeperName: circle.keeperName,
        memberCount: Number(circle.memberCount),
        alreadyMember: Boolean(circle.alreadyMember),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
