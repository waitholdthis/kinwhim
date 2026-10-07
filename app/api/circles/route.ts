import {
  database,
  jsonError,
  nowSeconds,
  requireViewer,
  upsertProfile,
} from "@/lib/kinwhim-server";

export async function POST(request: Request) {
  try {
    const viewer = await requireViewer();
    await upsertProfile(viewer);
    const body = (await request.json()) as {
      action?: "create" | "join";
      name?: string;
      code?: string;
      timezone?: string;
    };
    const db = database();
    const now = nowSeconds();

    if (body.action === "join") {
      const code = body.code?.trim().toUpperCase();
      if (!code) return Response.json({ error: "Enter an invite code." }, { status: 400 });
      const circle = await db
        .prepare("SELECT id FROM circles WHERE invite_code = ? LIMIT 1")
        .bind(code)
        .first<{ id: string }>();
      if (!circle) return Response.json({ error: "That invite code is taking a nap." }, { status: 404 });
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

function makeInviteCode() {
  const words = ["WINK", "MOON", "MINT", "BLOOM", "PICO", "JOLLY", "NOVA", "BIRD"];
  const word = words[Math.floor(Math.random() * words.length)];
  const suffix = Math.floor(100 + Math.random() * 900);
  return `${word}${suffix}`;
}
