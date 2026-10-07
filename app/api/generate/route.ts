import { Buffer } from "node:buffer";
import { env } from "cloudflare:workers";
import {
  bucket,
  database,
  jsonError,
  nowSeconds,
  requireCircleMember,
  requireViewer,
} from "@/lib/kinwhim-server";

type CheckinRow = {
  photoKey: string;
  name: string;
  mood: string | null;
  caption: string | null;
};

export async function POST(request: Request) {
  try {
    const viewer = await requireViewer();
    const body = (await request.json()) as { circleId?: string; day?: string };
    if (!body.circleId || !body.day) {
      return Response.json({ error: "Choose a circle and day." }, { status: 400 });
    }
    await requireCircleMember(body.circleId, viewer.id);
    if (!env.OPENAI_API_KEY) {
      return Response.json(
        { error: "The memory maker is not connected yet." },
        { status: 503 },
      );
    }

    const db = database();
    const circle = await db
      .prepare("SELECT name, style FROM circles WHERE id = ?")
      .bind(body.circleId)
      .first<{ name: string; style: string }>();
    if (!circle) return Response.json({ error: "Circle not found." }, { status: 404 });

    const checkinRows = await db
      .prepare(
        `SELECT ci.photo_key AS photoKey, p.display_name AS name, ci.mood, ci.caption
         FROM checkins ci
         INNER JOIN profiles p ON p.id = ci.user_id
         WHERE ci.circle_id = ? AND ci.day = ? AND ci.consent_transform = 1
         ORDER BY ci.created_at ASC`,
      )
      .bind(body.circleId, body.day)
      .all<CheckinRow>();
    const checkins = checkinRows.results;
    if (checkins.length < 2) {
      return Response.json(
        { error: "Two consenting check-ins are needed to make tonight’s world." },
        { status: 409 },
      );
    }

    const prompt = makePrompt(circle.name, circle.style, checkins);
    const form = new FormData();
    form.set("model", "gpt-image-2.5-flare");
    form.set("prompt", prompt);
    form.set("size", "1024x1024");
    form.set("quality", "medium");
    form.set("output_format", "png");

    for (const [index, checkin] of checkins.entries()) {
      const object = await bucket().get(checkin.photoKey);
      if (!object) continue;
      const contentType = object.httpMetadata?.contentType || "image/jpeg";
      const bytes = await object.arrayBuffer();
      form.append(
        "image[]",
        new File([bytes], `friend-${index + 1}.${extensionFor(contentType)}`, {
          type: contentType,
        }),
      );
    }

    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
      body: form,
    });
    const result = (await response.json()) as {
      data?: Array<{ b64_json?: string }>;
      error?: { message?: string };
    };
    if (!response.ok || !result.data?.[0]?.b64_json) {
      throw new Error(result.error?.message || "The memory maker could not finish this one.");
    }

    const mediaKey = `memory:${body.circleId}:${body.day}:${crypto.randomUUID()}`;
    await bucket().put(mediaKey, Buffer.from(result.data[0].b64_json, "base64"), {
      httpMetadata: { contentType: "image/png" },
      customMetadata: { circleId: body.circleId, day: body.day, kind: "collage" },
    });

    const previous = await db
      .prepare("SELECT id, media_key AS mediaKey FROM memories WHERE circle_id = ? AND day = ?")
      .bind(body.circleId, body.day)
      .first<{ id: string; mediaKey: string }>();
    const memoryId = previous?.id ?? crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO memories
         (id, circle_id, day, media_key, kind, title, prompt, created_at)
         VALUES (?, ?, ?, ?, 'collage', ?, ?, ?)
         ON CONFLICT(circle_id, day) DO UPDATE SET
           media_key = excluded.media_key,
           kind = excluded.kind,
           title = excluded.title,
           prompt = excluded.prompt,
           created_at = excluded.created_at`,
      )
      .bind(
        memoryId,
        body.circleId,
        body.day,
        mediaKey,
        titleFor(checkins),
        prompt,
        nowSeconds(),
      )
      .run();
    if (previous?.mediaKey) await bucket().delete(previous.mediaKey);
    return Response.json({ ok: true, memoryId });
  } catch (error) {
    return jsonError(error);
  }
}

function makePrompt(circleName: string, style: string, checkins: CheckinRow[]) {
  const people = checkins
    .map(
      (checkin, index) =>
        `Reference ${index + 1} is ${checkin.name}${checkin.mood ? `, feeling ${checkin.mood}` : ""}${checkin.caption ? `, with the note “${checkin.caption}”` : ""}.`,
    )
    .join(" ");
  return `Create a joyful square friendship collage for a private group named “${circleName}”. ${people}
Preserve each person’s recognizable face, skin tone, hair, and distinctive features from their own reference image. Show everyone together in one warm, playful ${style} scene—an imaginative tiny adventure that feels affectionate, spontaneous, and funny, never romantic or humiliating. Use lively editorial composition, tactile paper textures, confetti-like details, rich warm color, and room for faces to breathe. Do not add names, words, logos, watermarks, extra people, or duplicated faces. Keep clothing non-revealing and the situation safe and everyday. The result should feel like a beautiful shared memory rather than an advertisement.`;
}

function titleFor(checkins: CheckinRow[]) {
  const moods = checkins.map((checkin) => checkin.mood).filter(Boolean);
  return moods.length ? `A very ${moods[0]} little world` : "Tonight’s little world";
}

function extensionFor(contentType: string) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  return "jpg";
}
