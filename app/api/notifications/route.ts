import { database, jsonError, nowSeconds, requireCircleMember, requireViewer } from "@/lib/kinwhim-server";

export async function POST(request: Request) {
  try {
    const viewer = await requireViewer();
    const body = (await request.json()) as { memoryId?: string };
    if (!body.memoryId) return Response.json({ error: "Memory not found." }, { status: 400 });
    const db = database();
    const memory = await db
      .prepare("SELECT circle_id AS circleId FROM memories WHERE id = ?")
      .bind(body.memoryId)
      .first<{ circleId: string }>();
    if (!memory) return Response.json({ error: "Memory not found." }, { status: 404 });
    await requireCircleMember(memory.circleId, viewer.id);
    await db
      .prepare(
        `INSERT INTO notification_reads (id, user_id, memory_id, read_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id, memory_id) DO UPDATE SET read_at = excluded.read_at`,
      )
      .bind(crypto.randomUUID(), viewer.id, body.memoryId, nowSeconds())
      .run();
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
