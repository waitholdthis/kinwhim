import { Buffer } from "node:buffer";
import { env } from "cloudflare:workers";
import { bucket, database, nowSeconds } from "@/lib/kinwhim-server";

type CheckinRow = {
  photoKey: string;
  name: string;
  mood: string | null;
  caption: string | null;
};

export class GenerationError extends Error {
  constructor(message: string, public status = 500) {
    super(message);
  }
}

export async function generateCircleMemory(input: {
  circleId: string;
  day: string;
  requestedBy: string;
}) {
  if (!env.OPENAI_API_KEY) {
    throw new GenerationError("The memory maker is not connected yet.", 503);
  }
  const db = database();
  const circle = await db
    .prepare("SELECT name, style FROM circles WHERE id = ?")
    .bind(input.circleId)
    .first<{ name: string; style: string }>();
  if (!circle) throw new GenerationError("Circle not found.", 404);

  const checkinRows = await db
    .prepare(
      `SELECT ci.photo_key AS photoKey, p.display_name AS name, ci.mood, ci.caption
       FROM checkins ci
       INNER JOIN profiles p ON p.id = ci.user_id
       WHERE ci.circle_id = ? AND ci.day = ? AND ci.consent_transform = 1
       ORDER BY ci.created_at ASC`,
    )
    .bind(input.circleId, input.day)
    .all<CheckinRow>();
  const checkins = checkinRows.results;
  if (checkins.length < 2) {
    throw new GenerationError(
      "Two consenting check-ins are needed to make tonight’s world.",
      409,
    );
  }

  const existingMemory = await db
    .prepare("SELECT id FROM memories WHERE circle_id = ? AND day = ? LIMIT 1")
    .bind(input.circleId, input.day)
    .first<{ id: string }>();
  if (existingMemory) {
    return { ok: true, memoryId: existingMemory.id, alreadyExists: true };
  }

  const jobNow = nowSeconds();
  await db
    .prepare(
      "DELETE FROM generation_jobs WHERE circle_id = ? AND day = ? AND status = 'working' AND updated_at < ?",
    )
    .bind(input.circleId, input.day, jobNow - 15 * 60)
    .run();
  const claim = await db
    .prepare(
      `INSERT OR IGNORE INTO generation_jobs
       (id, circle_id, day, status, requested_by, created_at, updated_at)
       VALUES (?, ?, ?, 'working', ?, ?, ?)`,
    )
    .bind(
      crypto.randomUUID(),
      input.circleId,
      input.day,
      input.requestedBy,
      jobNow,
      jobNow,
    )
    .run();
  if (!Number(claim.meta.changes ?? 0)) {
    return { ok: true, pending: true };
  }

  try {
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
      throw new GenerationError(
        result.error?.message || "The memory maker could not finish this one.",
        response.ok ? 500 : response.status,
      );
    }

    const mediaKey = `memory:${input.circleId}:${input.day}:${crypto.randomUUID()}`;
    await bucket().put(mediaKey, Buffer.from(result.data[0].b64_json, "base64"), {
      httpMetadata: { contentType: "image/png" },
      customMetadata: { circleId: input.circleId, day: input.day, kind: "collage" },
    });
    const memoryId = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO memories
         (id, circle_id, day, media_key, kind, title, prompt, created_at)
         VALUES (?, ?, ?, ?, 'collage', ?, ?, ?)`,
      )
      .bind(
        memoryId,
        input.circleId,
        input.day,
        mediaKey,
        titleFor(checkins),
        prompt,
        nowSeconds(),
      )
      .run();
    await db
      .prepare(
        "UPDATE generation_jobs SET status = 'complete', updated_at = ? WHERE circle_id = ? AND day = ?",
      )
      .bind(nowSeconds(), input.circleId, input.day)
      .run();
    return { ok: true, memoryId };
  } catch (error) {
    await db
      .prepare("DELETE FROM generation_jobs WHERE circle_id = ? AND day = ?")
      .bind(input.circleId, input.day)
      .run();
    throw error;
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
