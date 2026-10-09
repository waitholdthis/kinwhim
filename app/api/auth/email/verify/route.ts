import { env } from "cloudflare:workers";
import { signInResponse } from "@/lib/auth/accounts";
import { parsePlatform, sha256Hex } from "@/lib/auth/session";
import { normalizeEmail } from "@/lib/email";
import { database, jsonError, nowSeconds, readJson } from "@/lib/kinwhim-server";
import { allow, tooMany } from "@/lib/rate-limit";

const MAX_ATTEMPTS = 5;

export async function POST(request: Request) {
  try {
    const body = await readJson<{ email: string; code: string; name: string; platform: string }>(request);
    const email = normalizeEmail(body.email);
    const code = String(body.code ?? "").replace(/\D/g, "");
    if (!email || code.length !== 6) {
      return Response.json({ error: "Enter the 6-digit code from your email." }, { status: 400 });
    }
    if (!(await allow(`email-verify:${email}`, 15, 60 * 60))) return tooMany();

    const isReviewLogin =
      env.REVIEW_EMAIL && env.REVIEW_CODE &&
      email === env.REVIEW_EMAIL.toLowerCase() && code === env.REVIEW_CODE;

    if (!isReviewLogin) {
      const db = database();
      const row = await db
        .prepare(
          "SELECT id, code_hash AS codeHash, attempts FROM email_codes WHERE email = ? AND expires_at > ? ORDER BY created_at DESC LIMIT 1",
        )
        .bind(email, nowSeconds())
        .first<{ id: string; codeHash: string; attempts: number }>();
      if (!row || Number(row.attempts) >= MAX_ATTEMPTS) {
        return Response.json({ error: "That code has expired. Ask for a new one." }, { status: 400 });
      }
      if (row.codeHash !== (await sha256Hex(`${email}:${code}`))) {
        await db.prepare("UPDATE email_codes SET attempts = attempts + 1 WHERE id = ?").bind(row.id).run();
        return Response.json({ error: "That code doesn’t match. Check the newest email." }, { status: 400 });
      }
      await db.prepare("DELETE FROM email_codes WHERE email = ?").bind(email).run();
    }

    return signInResponse(
      request,
      { provider: "email", subject: email, email, emailVerified: true, name: body.name ?? null },
      parsePlatform(body.platform),
    );
  } catch (error) {
    return jsonError(error);
  }
}
