import { requireAdmin } from "@/lib/admin";
import { database, jsonError } from "@/lib/kinwhim-server";

export const dynamic = "force-dynamic";

// GET /api/admin/reports?status=open — the moderation queue, oldest first.
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const status = new URL(request.url).searchParams.get("status") ?? "open";
    const rows = await database()
      .prepare(
        `SELECT r.id, r.target_type AS targetType, r.target_id AS targetId, r.target_user_id AS targetUserId,
                r.circle_id AS circleId, r.reason, r.details, r.status, r.resolution,
                r.created_at AS createdAt, r.resolved_at AS resolvedAt,
                r.evidence_key IS NOT NULL AS hasEvidence,
                reporter.display_name AS reporterName, reporter.email AS reporterEmail,
                target.display_name AS targetName, target.email AS targetEmail,
                (SELECT COUNT(*) FROM reports other
                 WHERE other.target_user_id = r.target_user_id AND r.target_user_id IS NOT NULL) AS reportsAgainstUser
         FROM reports r
         LEFT JOIN profiles reporter ON reporter.id = r.reporter_id
         LEFT JOIN profiles target ON target.id = r.target_user_id
         WHERE r.status = ?
         ORDER BY r.created_at ASC
         LIMIT 100`,
      )
      .bind(status)
      .all();
    const counts = await database()
      .prepare("SELECT status, COUNT(*) AS count FROM reports GROUP BY status")
      .all<{ status: string; count: number }>();
    return Response.json({
      counts: Object.fromEntries(counts.results.map((row) => [row.status, Number(row.count)])),
      reports: rows.results.map((row) => ({
        ...row,
        evidenceUrl: row.hasEvidence ? `/api/admin/reports/${row.id}/evidence` : null,
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}
