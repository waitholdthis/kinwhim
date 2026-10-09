import { database, jsonError, nowSeconds, readJson, requireViewer } from "@/lib/kinwhim-server";

export async function POST(request: Request) {
  try {
    const viewer = await requireViewer();
    const body = await readJson<{ token: string; platform: string }>(request);
    const token = String(body.token ?? "");
    if (!/^Expo(nent)?PushToken\[.+\]$/.test(token)) {
      return Response.json({ error: "That push token looks unusual." }, { status: 400 });
    }
    const platform = body.platform === "android" ? "android" : "ios";
    const now = nowSeconds();
    await database()
      .prepare(
        `INSERT INTO push_tokens (id, user_id, token, platform, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(token) DO UPDATE SET user_id = excluded.user_id, platform = excluded.platform, updated_at = excluded.updated_at`,
      )
      .bind(crypto.randomUUID(), viewer.id, token, platform, now, now)
      .run();
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const viewer = await requireViewer();
    const body = await readJson<{ token: string }>(request);
    await database()
      .prepare("DELETE FROM push_tokens WHERE token = ? AND user_id = ?")
      .bind(String(body.token ?? ""), viewer.id)
      .run();
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
