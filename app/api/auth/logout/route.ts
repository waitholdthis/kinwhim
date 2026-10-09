import { clearSessionCookie, deleteSession } from "@/lib/auth/session";
import { database, getViewer, jsonError, readJson } from "@/lib/kinwhim-server";

export async function POST(request: Request) {
  try {
    const viewer = await getViewer();
    const body = await readJson<{ pushToken: string }>(request);
    if (viewer) {
      await deleteSession(viewer.sessionId);
      if (body.pushToken) {
        await database()
          .prepare("DELETE FROM push_tokens WHERE token = ? AND user_id = ?")
          .bind(body.pushToken, viewer.id)
          .run();
      }
    }
    const secure = new URL(request.url).protocol === "https:";
    return Response.json({ ok: true }, { headers: { "set-cookie": clearSessionCookie(secure) } });
  } catch (error) {
    return jsonError(error);
  }
}
