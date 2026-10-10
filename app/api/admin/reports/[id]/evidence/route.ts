import { requireAdmin } from "@/lib/admin";
import { bucket, database, jsonError } from "@/lib/kinwhim-server";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(request);
    const { id } = await context.params;
    const report = await database()
      .prepare("SELECT evidence_key AS evidenceKey FROM reports WHERE id = ?")
      .bind(id)
      .first<{ evidenceKey: string | null }>();
    const object = report?.evidenceKey ? await bucket().get(report.evidenceKey) : null;
    if (!object) return new Response("Not found", { status: 404 });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("cache-control", "no-store");
    headers.set("x-content-type-options", "nosniff");
    return new Response(object.body, { headers });
  } catch (error) {
    return jsonError(error);
  }
}
