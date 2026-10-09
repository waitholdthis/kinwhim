import { database, jsonError, readJson, requireViewer } from "@/lib/kinwhim-server";
import { blockUser, sharesCircle } from "@/lib/safety";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const viewer = await requireViewer();
    const rows = await database()
      .prepare(
        `SELECT b.blocked_id AS id, COALESCE(p.display_name, 'Former member') AS name, b.created_at AS createdAt
         FROM user_blocks b LEFT JOIN profiles p ON p.id = b.blocked_id
         WHERE b.blocker_id = ? ORDER BY b.created_at DESC`,
      )
      .bind(viewer.id)
      .all();
    return Response.json({ blocked: rows.results });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const viewer = await requireViewer();
    const body = await readJson<{ userId: string }>(request);
    if (!body.userId || body.userId === viewer.id || !(await sharesCircle(viewer.id, body.userId))) {
      return Response.json({ error: "Person not found." }, { status: 404 });
    }
    await blockUser(viewer.id, body.userId);
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const viewer = await requireViewer();
    const body = await readJson<{ userId: string }>(request);
    await database()
      .prepare("DELETE FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?")
      .bind(viewer.id, String(body.userId ?? ""))
      .run();
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
