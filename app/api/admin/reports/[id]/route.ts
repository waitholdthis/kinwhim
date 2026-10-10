import { requireAdmin } from "@/lib/admin";
import { deleteMemories } from "@/lib/content";
import { bucket, database, jsonError, nowSeconds, readJson } from "@/lib/kinwhim-server";

type Action = "dismiss" | "remove_content" | "suspend_user" | "remove_and_suspend";

// POST /api/admin/reports/:id { action, note } — resolve a report.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const body = await readJson<{ action: Action; note: string }>(request);
    const db = database();
    const report = await db
      .prepare(
        `SELECT target_type AS targetType, target_id AS targetId, target_user_id AS targetUserId,
                evidence_key AS evidenceKey
         FROM reports WHERE id = ?`,
      )
      .bind(id)
      .first<{ targetType: string; targetId: string; targetUserId: string | null; evidenceKey: string | null }>();
    if (!report) return Response.json({ error: "Report not found." }, { status: 404 });

    const action = body.action;
    if (!action || !["dismiss", "remove_content", "suspend_user", "remove_and_suspend"].includes(action)) {
      return Response.json({ error: "Unknown action." }, { status: 400 });
    }

    if (action === "remove_content" || action === "remove_and_suspend") {
      if (report.targetType === "memory") await deleteMemories([report.targetId]);
      if (report.targetType === "photo") {
        const checkin = await db
          .prepare("SELECT photo_key AS photoKey FROM checkins WHERE id = ?")
          .bind(report.targetId)
          .first<{ photoKey: string }>();
        if (checkin) await bucket().delete(checkin.photoKey);
        await db.prepare("DELETE FROM checkins WHERE id = ?").bind(report.targetId).run();
      }
    }
    if ((action === "suspend_user" || action === "remove_and_suspend") && report.targetUserId) {
      await db.batch([
        db.prepare("UPDATE profiles SET suspended_at = ? WHERE id = ?").bind(nowSeconds(), report.targetUserId),
        db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(report.targetUserId),
        db.prepare("DELETE FROM push_tokens WHERE user_id = ?").bind(report.targetUserId),
      ]);
    }
    // Dismissed reports don't need the evidence copy.
    if (action === "dismiss" && report.evidenceKey) await bucket().delete(report.evidenceKey);

    const note = String(body.note ?? "").slice(0, 500);
    await db
      .prepare(
        `UPDATE reports SET status = 'resolved', resolution = ?, resolved_at = ?,
                evidence_key = CASE WHEN ? = 'dismiss' THEN NULL ELSE evidence_key END
         WHERE id = ?`,
      )
      .bind(note ? `${action}: ${note}` : action, nowSeconds(), action, id)
      .run();
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
