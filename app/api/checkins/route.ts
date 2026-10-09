import {
  bucket,
  database,
  jsonError,
  nowSeconds,
  requireCircleMember,
  requireCurrentTerms,
  requireViewer,
} from "@/lib/kinwhim-server";
import { allow, tooMany } from "@/lib/rate-limit";

const MAX_PHOTO_BYTES = 12 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const viewer = await requireViewer();
    requireCurrentTerms(viewer);
    if (!(await allow(`upload:${viewer.id}`, 40, 24 * 60 * 60))) return tooMany();
    const form = await request.formData();
    const circleId = String(form.get("circleId") || "");
    const day = String(form.get("day") || "");
    const photo = form.get("photo");
    const mood = String(form.get("mood") || "sparkly").slice(0, 24);
    const caption = String(form.get("caption") || "").trim().slice(0, 120);
    const consent = form.get("consentTransform") !== "false";

    if (!circleId || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      return Response.json({ error: "That check-in date looks unusual." }, { status: 400 });
    }
    await requireCircleMember(circleId, viewer.id);
    if (!(photo instanceof File) || !/^image\/(jpeg|png|webp|heic|heif)$/.test(photo.type)) {
      return Response.json({ error: "Choose a photo to check in." }, { status: 400 });
    }
    if (photo.size > MAX_PHOTO_BYTES) {
      return Response.json({ error: "Keep the photo under 12 MB." }, { status: 413 });
    }

    const db = database();
    const existing = await db
      .prepare(
        "SELECT id, photo_key AS photoKey FROM checkins WHERE circle_id = ? AND user_id = ? AND day = ?",
      )
      .bind(circleId, viewer.id, day)
      .first<{ id: string; photoKey: string }>();
    const key = `checkin:${circleId}:${day}:${viewer.id}:${crypto.randomUUID()}`;
    await bucket().put(key, photo.stream(), {
      httpMetadata: { contentType: photo.type },
      customMetadata: { circleId, userId: viewer.id, day },
    });
    const now = nowSeconds();
    const checkinId = existing?.id ?? crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO checkins
         (id, circle_id, user_id, day, photo_key, mood, caption, consent_transform, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(circle_id, user_id, day) DO UPDATE SET
           photo_key = excluded.photo_key,
           mood = excluded.mood,
           caption = excluded.caption,
           consent_transform = excluded.consent_transform,
           updated_at = excluded.updated_at`,
      )
      .bind(
        checkinId,
        circleId,
        viewer.id,
        day,
        key,
        mood,
        caption,
        consent ? 1 : 0,
        now,
        now,
      )
      .run();
    if (existing?.photoKey) await bucket().delete(existing.photoKey);
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const viewer = await requireViewer();
    const body = (await request.json()) as { circleId?: string; day?: string };
    if (!body.circleId || !body.day) {
      return Response.json({ error: "Choose a check-in to remove." }, { status: 400 });
    }
    await requireCircleMember(body.circleId, viewer.id);
    const db = database();
    const existing = await db
      .prepare(
        "SELECT photo_key AS photoKey FROM checkins WHERE circle_id = ? AND user_id = ? AND day = ?",
      )
      .bind(body.circleId, viewer.id, body.day)
      .first<{ photoKey: string }>();
    if (existing?.photoKey) await bucket().delete(existing.photoKey);
    await db
      .prepare("DELETE FROM checkins WHERE circle_id = ? AND user_id = ? AND day = ?")
      .bind(body.circleId, viewer.id, body.day)
      .run();
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
