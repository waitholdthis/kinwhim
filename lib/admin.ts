import { env } from "cloudflare:workers";
import { splitList } from "@/lib/auth/apple";
import { getViewer, type Viewer } from "@/lib/kinwhim-server";

export function requireSecret(request: Request, secret: string | undefined) {
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || !timingSafeEqual(provided, secret)) {
    throw Response.json({ error: "Not authorized." }, { status: 401 });
  }
}

// Moderators are signed-in people whose (verified) email is in ADMIN_EMAILS.
export function isAdmin(viewer: Viewer | null) {
  if (!viewer?.email) return false;
  return splitList(env.ADMIN_EMAILS).map((email) => email.toLowerCase()).includes(viewer.email.toLowerCase());
}

// Admin APIs accept either a moderator's session or the ADMIN_TOKEN bearer
// secret (for scripts).
export async function requireAdmin(request: Request) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (env.ADMIN_TOKEN && bearer && timingSafeEqual(bearer, env.ADMIN_TOKEN)) return;
  // Otherwise the bearer (or cookie) must be a moderator's own session.
  if (!isAdmin(await getViewer())) {
    throw Response.json({ error: "Not authorized." }, { status: 401 });
  }
}

function timingSafeEqual(a: string, b: string) {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  let diff = left.length ^ right.length;
  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    diff |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return diff === 0;
}
