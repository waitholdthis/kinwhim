import { makeInviteCode, MAX_CIRCLE_MEMBERS, normalizeInviteCode } from "@/lib/invites";
import {
  database,
  jsonError,
  nowSeconds,
  readJson,
  requireViewer,
} from "@/lib/kinwhim-server";
import { allow, tooMany } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const viewer = await requireViewer();
    const body = await readJson<{
      action: "create" | "join";
      name: string;
      code: string;
      timezone: string;
    }>(request);
    const db = database();
    const now = nowSeconds();

    if (body.action === "join") {
      if (!(await allow(`join:${viewer.id}`, 20, 60 * 60))) return tooMany();
      const code = normalizeInviteCode(body.code);
      if (!code) return Response.json({ error: "Enter an invite code." }, { status: 400 });
      const circle = await db
        .prepare(
          `SELECT id, (SELECT COUNT(*) FROM circle_members WHERE circle_id = circles.id) AS memberCount
           FROM circles WHERE invite_code = ? LIMIT 1`,
        )
        .bind(code)
        .first<{ id: string; memberCount: number }>();
      if (!circle) return Response.json({ error: "That invite code is taking a nap." }, { status: 404 });
      if (Number(circle.memberCount) >= MAX_CIRCLE_MEMBERS) {
        return Response.json(
          { error: `Circles hold up to ${MAX_CIRCLE_MEMBERS} friends, and this one is full.` },
          { status: 409 },
        );
      }
      await db
        .prepare(
          `INSERT INTO circle_members (id, circle_id, user_id, role, joined_at)
           VALUES (?, ?, ?, 'member', ?)
           ON CONFLICT(circle_id, user_id) DO NOTHING`,
        )
        .bind(crypto.randomUUID(), circle.id, viewer.id, now)
        .run();
      return Response.json({ circleId: circle.id });
    }

    if (!(await allow(`create-circle:${viewer.id}`, 10, 24 * 60 * 60))) return tooMany();
    const name = body.name?.trim().slice(0, 48);
    if (!name) return Response.json({ error: "Give your circle a name." }, { status: 400 });
    const circleId = crypto.randomUUID();
    const inviteCode = makeInviteCode();
    const timezone = body.timezone || "America/New_York";
    await db.batch([
      db
        .prepare(
          `INSERT INTO circles
           (id, name, invite_code, owner_id, reveal_hour, timezone, style, created_at)
           VALUES (?, ?, ?, ?, 21, ?, 'whimsical', ?)`,
        )
        .bind(circleId, name, inviteCode, viewer.id, timezone, now),
      db
        .prepare(
          `INSERT INTO circle_members (id, circle_id, user_id, role, joined_at)
           VALUES (?, ?, ?, 'owner', ?)`,
        )
        .bind(crypto.randomUUID(), circleId, viewer.id, now),
    ]);
    return Response.json({ circleId, inviteCode });
  } catch (error) {
    return jsonError(error);
  }
}
