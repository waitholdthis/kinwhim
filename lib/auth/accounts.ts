import { database, nowSeconds } from "@/lib/kinwhim-server";
import { CURRENT_TERMS_VERSION } from "@/lib/policies";
import { createSession, type Platform, sessionCookie } from "@/lib/auth/session";

export type Provider = "apple" | "google" | "email";

type SignInInput = {
  provider: Provider;
  subject: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  refreshToken?: string | null;
};

export async function findOrCreateUser(input: SignInInput) {
  const db = database();
  const now = nowSeconds();
  const email = input.email?.trim().toLowerCase() || null;

  const identity = await db
    .prepare("SELECT user_id AS userId FROM identities WHERE provider = ? AND subject = ? LIMIT 1")
    .bind(input.provider, input.subject)
    .first<{ userId: string }>();
  if (identity) {
    if (input.refreshToken) {
      await db
        .prepare("UPDATE identities SET refresh_token = ? WHERE provider = ? AND subject = ?")
        .bind(input.refreshToken, input.provider, input.subject)
        .run();
    }
    return { userId: identity.userId, created: false };
  }

  // A verified email links to an existing account, including profiles created
  // under the old ChatGPT sign-in, so people keep their circles and memories.
  let userId: string | null = null;
  if (email && input.emailVerified) {
    const existing = await db
      .prepare("SELECT id FROM profiles WHERE lower(email) = ? ORDER BY created_at ASC LIMIT 1")
      .bind(email)
      .first<{ id: string }>();
    userId = existing?.id ?? null;
  }

  const created = !userId;
  if (!userId) {
    userId = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO profiles (id, email, display_name, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(userId, email ?? "", cleanName(input.name) ?? email?.split("@")[0] ?? "Friend", now, now)
      .run();
  }
  await db
    .prepare(
      `INSERT INTO identities (id, user_id, provider, subject, email, refresh_token, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(crypto.randomUUID(), userId, input.provider, input.subject, email, input.refreshToken ?? null, now)
    .run();
  return { userId, created };
}

export async function signInResponse(
  request: Request,
  input: SignInInput,
  platform: Platform,
) {
  const { userId, created } = await findOrCreateUser(input);
  const token = await createSession(userId, platform);
  const profile = await database()
    .prepare("SELECT id, email, display_name AS name, terms_version AS termsVersion FROM profiles WHERE id = ?")
    .bind(userId)
    .first<{ id: string; email: string; name: string; termsVersion: string | null }>();
  const user = {
    id: userId,
    email: profile?.email ?? "",
    name: profile?.name ?? "Friend",
    needsTerms: profile?.termsVersion !== CURRENT_TERMS_VERSION,
    created,
  };

  if (platform === "web") {
    const secure = new URL(request.url).protocol === "https:";
    return Response.json({ user }, { headers: { "set-cookie": sessionCookie(token, secure) } });
  }
  return Response.json({ token, user });
}

export function cleanName(value: string | null | undefined) {
  const trimmed = value?.replace(/\s+/g, " ").trim().slice(0, 40);
  return trimmed || null;
}
