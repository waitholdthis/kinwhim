import { env } from "cloudflare:workers";
import { headers } from "next/headers";

export type Viewer = {
  id: string;
  email: string;
  name: string;
};

export async function requireViewer(): Promise<Viewer> {
  const requestHeaders = await headers();
  const id = requestHeaders.get("oai-authenticated-user-id");
  const email = requestHeaders.get("oai-authenticated-user-email");
  if (!id || !email) throw new Response("Sign in required", { status: 401 });

  const encodedName = requestHeaders.get("oai-authenticated-user-full-name");
  const name =
    encodedName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? safeDecode(encodedName) ?? email.split("@")[0]
      : email.split("@")[0];

  return { id, email, name };
}

export function database(): D1Database {
  if (!env.DB) throw new Error("Kinwhim database is unavailable.");
  return env.DB;
}

export function bucket(): R2Bucket {
  if (!env.BUCKET) throw new Error("Kinwhim photo storage is unavailable.");
  return env.BUCKET;
}

export function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

export async function upsertProfile(viewer: Viewer) {
  const now = nowSeconds();
  await database()
    .prepare(
      `INSERT INTO profiles (id, email, display_name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         email = excluded.email,
         display_name = excluded.display_name,
         updated_at = excluded.updated_at`,
    )
    .bind(viewer.id, viewer.email, viewer.name, now, now)
    .run();
}

export async function requireCircleMember(circleId: string, userId: string) {
  const membership = await database()
    .prepare(
      "SELECT id, role FROM circle_members WHERE circle_id = ? AND user_id = ? LIMIT 1",
    )
    .bind(circleId, userId)
    .first<{ id: string; role: string }>();
  if (!membership) throw new Response("You are not in this circle", { status: 403 });
  return membership;
}

export function mediaUrl(key: string | null) {
  return key ? `/api/media/${encodeURIComponent(key)}` : null;
}

export function jsonError(error: unknown) {
  if (error instanceof Response) return error;
  const message = error instanceof Error ? error.message : "Something went sideways.";
  return Response.json({ error: message }, { status: 500 });
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
