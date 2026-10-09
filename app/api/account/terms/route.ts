import { database, jsonError, nowSeconds, readJson, requireViewer } from "@/lib/kinwhim-server";
import { CURRENT_TERMS_VERSION } from "@/lib/policies";

export async function POST(request: Request) {
  try {
    const viewer = await requireViewer();
    const body = await readJson<{ version: string; ageConfirmed: boolean }>(request);
    if (body.version !== CURRENT_TERMS_VERSION) {
      return Response.json({ error: "The Terms changed. Please review the latest version." }, { status: 409 });
    }
    if (body.ageConfirmed !== true) {
      return Response.json({ error: "Please confirm you meet the minimum age." }, { status: 400 });
    }
    const now = nowSeconds();
    await database()
      .prepare("UPDATE profiles SET terms_version = ?, terms_accepted_at = ?, updated_at = ? WHERE id = ?")
      .bind(CURRENT_TERMS_VERSION, now, now, viewer.id)
      .run();
    return Response.json({ ok: true, termsVersion: CURRENT_TERMS_VERSION });
  } catch (error) {
    return jsonError(error);
  }
}
