import { cleanName } from "@/lib/auth/accounts";
import { database, jsonError, nowSeconds, readJson, requireViewer } from "@/lib/kinwhim-server";
import { CURRENT_TERMS_VERSION } from "@/lib/policies";
import { unreadCountFor } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const viewer = await requireViewer();
    const db = database();
    const identities = await db
      .prepare("SELECT provider FROM identities WHERE user_id = ?")
      .bind(viewer.id)
      .all<{ provider: string }>();
    const profile = await db
      .prepare("SELECT reminders_enabled AS remindersEnabled FROM profiles WHERE id = ?")
      .bind(viewer.id)
      .first<{ remindersEnabled: number }>();
    return Response.json({
      user: {
        id: viewer.id,
        name: viewer.name,
        email: viewer.email,
        needsTerms: viewer.termsVersion !== CURRENT_TERMS_VERSION,
        remindersEnabled: Boolean(profile?.remindersEnabled ?? 1),
        providers: identities.results.map((row) => row.provider),
      },
      termsVersion: CURRENT_TERMS_VERSION,
      unreadCount: await unreadCountFor(viewer.id),
    });
  } catch (error) {
    return jsonError(error);
  }
}

// Updates the display name and/or the check-in reminder preference.
export async function PATCH(request: Request) {
  try {
    const viewer = await requireViewer();
    const body = await readJson<{ name: string; remindersEnabled: boolean }>(request);
    const db = database();
    const now = nowSeconds();
    const result: { ok: true; name?: string; remindersEnabled?: boolean } = { ok: true };

    if (body.name !== undefined) {
      const name = cleanName(body.name);
      if (!name) return Response.json({ error: "Add a name your friends will recognize." }, { status: 400 });
      await db.prepare("UPDATE profiles SET display_name = ?, updated_at = ? WHERE id = ?").bind(name, now, viewer.id).run();
      result.name = name;
    }
    if (body.remindersEnabled !== undefined) {
      if (typeof body.remindersEnabled !== "boolean") {
        return Response.json({ error: "Reminders must be on or off." }, { status: 400 });
      }
      await db
        .prepare("UPDATE profiles SET reminders_enabled = ?, updated_at = ? WHERE id = ?")
        .bind(body.remindersEnabled ? 1 : 0, now, viewer.id)
        .run();
      result.remindersEnabled = body.remindersEnabled;
    }
    if (result.name === undefined && result.remindersEnabled === undefined) {
      return Response.json({ error: "Nothing to update." }, { status: 400 });
    }
    return Response.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
