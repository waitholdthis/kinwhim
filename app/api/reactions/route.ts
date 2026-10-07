import {
  database,
  jsonError,
  nowSeconds,
  requireCircleMember,
  requireViewer,
} from "@/lib/kinwhim-server";

const ALLOWED = new Set(["✨", "😂", "🥹", "🫶", "🔥"]);

export async function POST(request: Request) {
  try {
    const viewer = await requireViewer();
    const body = (await request.json()) as { memoryId?: string; emoji?: string };
    if (!body.memoryId || !body.emoji || !ALLOWED.has(body.emoji)) {
      return Response.json({ error: "Pick a Kinwhim reaction." }, { status: 400 });
    }
    const db = database();
    const memory = await db
      .prepare("SELECT circle_id AS circleId FROM memories WHERE id = ?")
      .bind(body.memoryId)
      .first<{ circleId: string }>();
    if (!memory) return Response.json({ error: "Memory not found." }, { status: 404 });
    await requireCircleMember(memory.circleId, viewer.id);
    await db
      .prepare(
        `INSERT INTO reactions (id, memory_id, user_id, emoji, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(memory_id, user_id) DO UPDATE SET
           emoji = excluded.emoji,
           created_at = excluded.created_at`,
      )
      .bind(crypto.randomUUID(), body.memoryId, viewer.id, body.emoji, nowSeconds())
      .run();
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
