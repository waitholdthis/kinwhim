import { env } from "cloudflare:workers";
import { sendEmail } from "@/lib/email";
import { bucket, database, nowSeconds } from "@/lib/kinwhim-server";

export async function blockUser(blockerId: string, blockedId: string) {
  if (blockerId === blockedId) return;
  await database()
    .prepare(
      `INSERT INTO user_blocks (id, blocker_id, blocked_id, created_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(blocker_id, blocked_id) DO NOTHING`,
    )
    .bind(crypto.randomUUID(), blockerId, blockedId, nowSeconds())
    .run();
}

export async function sharesCircle(userA: string, userB: string) {
  const row = await database()
    .prepare(
      `SELECT 1 AS shared FROM circle_members a
       INNER JOIN circle_members b ON b.circle_id = a.circle_id
       WHERE a.user_id = ? AND b.user_id = ? LIMIT 1`,
    )
    .bind(userA, userB)
    .first<{ shared: number }>();
  return Boolean(row);
}

// Keeps a private copy of reported media so moderators can review it even if
// the original is deleted or ages out before the report is handled.
export async function preserveEvidence(reportId: string, sourceKey: string | null) {
  if (!sourceKey) return null;
  const object = await bucket().get(sourceKey);
  if (!object) return null;
  const key = `report:${reportId}`;
  await bucket().put(key, await object.arrayBuffer(), {
    httpMetadata: { contentType: object.httpMetadata?.contentType || "image/jpeg" },
    customMetadata: { reportId, kind: "evidence" },
  });
  return key;
}

export async function notifyModerators(report: {
  id: string;
  targetType: string;
  reason: string;
  details: string | null;
}) {
  if (!env.MODERATION_EMAIL) return;
  await sendEmail({
    to: env.MODERATION_EMAIL,
    subject: `[Kinwhim report] ${report.reason} · ${report.targetType}`,
    text: `A new Kinwhim report needs review within 24 hours.\n\nReport: ${report.id}\nType: ${report.targetType}\nReason: ${report.reason}\nDetails: ${report.details || "(none)"}\n\nReview with GET /api/admin/reports.`,
  }).catch((error) => console.error("Moderator email failed", error));
}
