import { database, nowSeconds } from "@/lib/kinwhim-server";

// Fixed-window counter in D1. Returns false once `limit` hits occur within
// `windowSeconds` for the same key.
export async function allow(key: string, limit: number, windowSeconds: number) {
  const now = nowSeconds();
  const row = await database()
    .prepare(
      `INSERT INTO rate_limits (key, count, window_start) VALUES (?, 1, ?)
       ON CONFLICT(key) DO UPDATE SET
         count = CASE WHEN rate_limits.window_start <= ? THEN 1 ELSE rate_limits.count + 1 END,
         window_start = CASE WHEN rate_limits.window_start <= ? THEN excluded.window_start ELSE rate_limits.window_start END
       RETURNING count`,
    )
    .bind(key, now, now - windowSeconds, now - windowSeconds)
    .first<{ count: number }>();
  return Number(row?.count ?? 1) <= limit;
}

export function clientIp(request: Request) {
  return request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export function tooMany(message = "Too many tries. Take a breath and try again in a bit.") {
  return Response.json({ error: message, code: "rate_limited" }, { status: 429 });
}
