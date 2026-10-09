import { env } from "cloudflare:workers";
import { sha256Hex } from "@/lib/auth/session";
import { normalizeEmail, sendEmail } from "@/lib/email";
import { database, jsonError, nowSeconds, readJson } from "@/lib/kinwhim-server";
import { allow, clientIp, tooMany } from "@/lib/rate-limit";

const CODE_TTL_SECONDS = 10 * 60;

export async function POST(request: Request) {
  try {
    const body = await readJson<{ email: string }>(request);
    const email = normalizeEmail(body.email);
    if (!email) return Response.json({ error: "Enter a valid email address." }, { status: 400 });

    if (
      !(await allow(`email-start:${email}`, 5, 60 * 60)) ||
      !(await allow(`email-start-ip:${clientIp(request)}`, 30, 60 * 60))
    ) {
      return tooMany();
    }

    // App Review uses a fixed code configured in secrets; nothing is emailed.
    if (env.REVIEW_EMAIL && email === env.REVIEW_EMAIL.toLowerCase()) {
      return Response.json({ ok: true });
    }

    const code = sixDigitCode();
    const now = nowSeconds();
    const db = database();
    await db.batch([
      db.prepare("DELETE FROM email_codes WHERE email = ? OR expires_at < ?").bind(email, now),
      db
        .prepare(
          "INSERT INTO email_codes (id, email, code_hash, attempts, expires_at, created_at) VALUES (?, ?, ?, 0, ?, ?)",
        )
        .bind(crypto.randomUUID(), email, await sha256Hex(`${email}:${code}`), now + CODE_TTL_SECONDS, now),
    ]);
    await sendEmail({
      to: email,
      subject: `${code} is your Kinwhim code`,
      text: `Your Kinwhim sign-in code is ${code}.\n\nIt expires in 10 minutes. If you didn’t ask for it, you can ignore this email.`,
      html: `<div style="font-family:Georgia,serif;background:#f6f1e8;padding:32px;color:#242117"><p style="font-size:14px;letter-spacing:.18em;text-transform:uppercase;color:#b75d3e;font-family:Arial,sans-serif;font-weight:800">Kinwhim</p><p style="font-size:18px">Your sign-in code is</p><p style="font-size:40px;font-weight:900;letter-spacing:.2em">${code}</p><p style="font-family:Arial,sans-serif;font-size:13px;color:#6d675a">It expires in 10 minutes. If you didn’t ask for it, you can ignore this email.</p></div>`,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

function sixDigitCode() {
  const [value] = crypto.getRandomValues(new Uint32Array(1));
  return String(value % 1_000_000).padStart(6, "0");
}
