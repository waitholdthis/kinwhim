import { cleanName } from "@/lib/auth/accounts";
import { database, jsonError, nowSeconds, readJson, requireViewer } from "@/lib/kinwhim-server";
import { CURRENT_TERMS_VERSION } from "@/lib/policies";
import { unreadCountFor } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const viewer = await requireViewer();
    const identities = await database()
      .prepare("SELECT provider FROM identities WHERE user_id = ?")
      .bind(viewer.id)
      .all<{ provider: string }>();
    return Response.json({
      user: {
        id: viewer.id,
        name: viewer.name,
        email: viewer.email,
        needsTerms: viewer.termsVersion !== CURRENT_TERMS_VERSION,
        providers: identities.results.map((row) => row.provider),
      },
      termsVersion: CURRENT_TERMS_VERSION,
      unreadCount: await unreadCountFor(viewer.id),
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const viewer = await requireViewer();
    const body = await readJson<{ name: string }>(request);
    const name = cleanName(body.name);
    if (!name) return Response.json({ error: "Add a name your friends will recognize." }, { status: 400 });
    await database()
      .prepare("UPDATE profiles SET display_name = ?, updated_at = ? WHERE id = ?")
      .bind(name, nowSeconds(), viewer.id)
      .run();
    return Response.json({ ok: true, name });
  } catch (error) {
    return jsonError(error);
  }
}
