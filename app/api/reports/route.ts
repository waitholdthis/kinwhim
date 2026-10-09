import { database, jsonError, nowSeconds, readJson, requireCircleMember, requireViewer } from "@/lib/kinwhim-server";
import { REPORT_REASONS, type ReportReason } from "@/lib/policies";
import { allow, tooMany } from "@/lib/rate-limit";
import { blockUser, notifyModerators, preserveEvidence, sharesCircle } from "@/lib/safety";

type Body = {
  targetType: "memory" | "photo" | "user";
  targetId: string;
  reason: string;
  details: string;
  block: boolean;
};

export async function POST(request: Request) {
  try {
    const viewer = await requireViewer();
    if (!(await allow(`report:${viewer.id}`, 30, 24 * 60 * 60))) return tooMany();
    const body = await readJson<Body>(request);
    const reason = body.reason as ReportReason;
    if (!REPORT_REASONS.includes(reason) || !body.targetId) {
      return Response.json({ error: "Choose what’s wrong so we can look into it." }, { status: 400 });
    }
    const details = String(body.details ?? "").trim().slice(0, 1000) || null;
    const db = database();

    let circleId: string | null = null;
    let targetUserId: string | null = null;
    let mediaKey: string | null = null;

    if (body.targetType === "memory") {
      const memory = await db
        .prepare("SELECT circle_id AS circleId, media_key AS mediaKey FROM memories WHERE id = ?")
        .bind(body.targetId)
        .first<{ circleId: string; mediaKey: string }>();
      if (!memory) return Response.json({ error: "Memory not found." }, { status: 404 });
      await requireCircleMember(memory.circleId, viewer.id);
      circleId = memory.circleId;
      mediaKey = memory.mediaKey;
    } else if (body.targetType === "photo") {
      const checkin = await db
        .prepare("SELECT circle_id AS circleId, user_id AS userId, photo_key AS photoKey FROM checkins WHERE id = ?")
        .bind(body.targetId)
        .first<{ circleId: string; userId: string; photoKey: string }>();
      if (!checkin) return Response.json({ error: "Photo not found." }, { status: 404 });
      await requireCircleMember(checkin.circleId, viewer.id);
      circleId = checkin.circleId;
      targetUserId = checkin.userId;
      mediaKey = checkin.photoKey;
    } else if (body.targetType === "user") {
      if (body.targetId === viewer.id || !(await sharesCircle(viewer.id, body.targetId))) {
        return Response.json({ error: "Person not found." }, { status: 404 });
      }
      targetUserId = body.targetId;
    } else {
      return Response.json({ error: "Choose what you’re reporting." }, { status: 400 });
    }

    const reportId = crypto.randomUUID();
    const evidenceKey = await preserveEvidence(reportId, mediaKey);
    await db
      .prepare(
        `INSERT INTO reports
         (id, reporter_id, target_type, target_id, target_user_id, circle_id, reason, details, evidence_key, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)`,
      )
      .bind(reportId, viewer.id, body.targetType, body.targetId, targetUserId, circleId, reason, details, evidenceKey, nowSeconds())
      .run();
    const blocked = Boolean(body.block && targetUserId && targetUserId !== viewer.id);
    if (blocked) await blockUser(viewer.id, targetUserId!);
    await notifyModerators({ id: reportId, targetType: body.targetType, reason, details });

    return Response.json({ ok: true, reportId, blocked });
  } catch (error) {
    return jsonError(error);
  }
}
