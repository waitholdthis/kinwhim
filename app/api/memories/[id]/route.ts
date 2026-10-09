import { deleteMemories } from "@/lib/content";
import { database, jsonError, requireCircleMember, requireViewer } from "@/lib/kinwhim-server";

// The keeper, or anyone who appears in a memory, can delete it for the circle.
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const viewer = await requireViewer();
    const { id } = await context.params;
    const db = database();
    const memory = await db
      .prepare("SELECT circle_id AS circleId FROM memories WHERE id = ?")
      .bind(id)
      .first<{ circleId: string }>();
    if (!memory) return Response.json({ error: "Memory not found." }, { status: 404 });
    const membership = await requireCircleMember(memory.circleId, viewer.id);
    const featured = await db
      .prepare("SELECT 1 AS featured FROM memory_participants WHERE memory_id = ? AND user_id = ?")
      .bind(id, viewer.id)
      .first();
    if (membership.role !== "owner" && !featured) {
      return Response.json({ error: "Only the keeper or someone in this memory can delete it." }, { status: 403 });
    }
    await deleteMemories([id]);
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
