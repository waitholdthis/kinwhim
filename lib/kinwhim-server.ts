import { env } from "cloudflare:workers";
import { headers } from "next/headers";
import { resolveSession, sessionTokenFrom } from "@/lib/auth/session";
import { CURRENT_TERMS_VERSION } from "@/lib/policies";

export type Viewer = {
  id: string;
  email: string;
  name: string;
  termsVersion: string | null;
  sessionId: string;
};

export async function getViewer(): Promise<Viewer | null> {
  const token = sessionTokenFrom(await headers());
  return token ? resolveSession(token) : null;
}

export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) {
    throw Response.json({ error: "Sign in required", code: "signed_out" }, { status: 401 });
  }
  return viewer;
}

export function requireCurrentTerms(viewer: Viewer) {
  if (viewer.termsVersion !== CURRENT_TERMS_VERSION) {
    throw Response.json(
      {
        error: "Please review and accept the Kinwhim Terms before sharing photos.",
        code: "terms_required",
        termsVersion: CURRENT_TERMS_VERSION,
      },
      { status: 403 },
    );
  }
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

export function publicOrigin(request: Request) {
  return env.PUBLIC_APP_URL?.replace(/\/$/, "") || new URL(request.url).origin;
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

// Everyone the user has blocked or been blocked by. Blocking is mutual for
// visibility: neither side sees the other's selfies, and they are never put
// into the same new memory.
export async function blockedUserIds(userId: string) {
  const rows = await database()
    .prepare(
      `SELECT blocked_id AS id FROM user_blocks WHERE blocker_id = ?
       UNION SELECT blocker_id AS id FROM user_blocks WHERE blocked_id = ?`,
    )
    .bind(userId, userId)
    .all<{ id: string }>();
  return new Set(rows.results.map((row) => row.id));
}

export function mediaUrl(key: string | null) {
  return key ? `/api/media/${encodeURIComponent(key)}` : null;
}

export function jsonError(error: unknown) {
  if (error instanceof Response) return error;
  console.error(error);
  const message = error instanceof Error ? error.message : "Something went sideways.";
  return Response.json({ error: message }, { status: 500 });
}

export async function readJson<T>(request: Request): Promise<Partial<T>> {
  try {
    return (await request.json()) as Partial<T>;
  } catch {
    return {};
  }
}
