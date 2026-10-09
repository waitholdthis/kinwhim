import { database, nowSeconds } from "@/lib/kinwhim-server";

export const SESSION_COOKIE = "kw_session";
const SESSION_TTL_SECONDS = 90 * 24 * 60 * 60;
// Refresh last_seen/expiry at most once a day to keep reads cheap.
const SESSION_TOUCH_SECONDS = 24 * 60 * 60;

export type Platform = "ios" | "android" | "web";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  termsVersion: string | null;
  sessionId: string;
};

export function parsePlatform(value: unknown): Platform {
  return value === "ios" || value === "android" ? value : "web";
}

export async function createSession(userId: string, platform: Platform) {
  const token = randomToken();
  const now = nowSeconds();
  await database()
    .prepare(
      `INSERT INTO sessions (id, user_id, token_hash, platform, created_at, last_seen_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(crypto.randomUUID(), userId, await sha256Hex(token), platform, now, now, now + SESSION_TTL_SECONDS)
    .run();
  return token;
}

export async function resolveSession(token: string): Promise<SessionUser | null> {
  const now = nowSeconds();
  const row = await database()
    .prepare(
      `SELECT s.id AS sessionId, s.last_seen_at AS lastSeenAt, p.id, p.email,
              p.display_name AS name, p.terms_version AS termsVersion, p.suspended_at AS suspendedAt
       FROM sessions s INNER JOIN profiles p ON p.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?
       LIMIT 1`,
    )
    .bind(await sha256Hex(token), now)
    .first<SessionUser & { lastSeenAt: number; suspendedAt: number | null }>();
  if (!row) return null;
  if (row.suspendedAt) {
    throw Response.json(
      { error: "This account has been suspended. Contact support@kinwhim.app.", code: "suspended" },
      { status: 403 },
    );
  }
  if (now - Number(row.lastSeenAt) > SESSION_TOUCH_SECONDS) {
    await database()
      .prepare("UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE id = ?")
      .bind(now, now + SESSION_TTL_SECONDS, row.sessionId)
      .run();
  }
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    termsVersion: row.termsVersion,
    sessionId: row.sessionId,
  };
}

export async function deleteSession(sessionId: string) {
  await database().prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
}

export function sessionTokenFrom(requestHeaders: Headers) {
  const authorization = requestHeaders.get("authorization");
  if (authorization?.startsWith("Bearer ")) return authorization.slice(7).trim() || null;
  const cookie = requestHeaders.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) return decodeURIComponent(rest.join("=")) || null;
  }
  return null;
}

export function sessionCookie(token: string, secure: boolean) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${secure ? "; Secure" : ""}`;
}

export function clearSessionCookie(secure: boolean) {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}

export function randomToken(bytes = 32) {
  const buffer = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(buffer, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
