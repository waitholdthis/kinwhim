import { env } from "cloudflare:workers";

export function requireSecret(request: Request, secret: string | undefined) {
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || !timingSafeEqual(provided, secret)) {
    throw Response.json({ error: "Not authorized." }, { status: 401 });
  }
}

export function requireAdmin(request: Request) {
  requireSecret(request, env.ADMIN_TOKEN);
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
