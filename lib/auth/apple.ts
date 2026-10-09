import { env } from "cloudflare:workers";
import { signEs256Jwt } from "@/lib/auth/jwt";

const APPLE_ISSUER = "https://appleid.apple.com";

export function appleClientIds() {
  return splitList(env.APPLE_CLIENT_IDS);
}

function canTalkToApple() {
  return Boolean(env.APPLE_TEAM_ID && env.APPLE_KEY_ID && env.APPLE_PRIVATE_KEY);
}

async function clientSecret(clientId: string) {
  const now = Math.floor(Date.now() / 1000);
  return signEs256Jwt(
    { kid: env.APPLE_KEY_ID },
    { iss: env.APPLE_TEAM_ID, iat: now, exp: now + 5 * 60, aud: APPLE_ISSUER, sub: clientId },
    env.APPLE_PRIVATE_KEY!,
  );
}

// Exchanges the one-time authorization code for a refresh token, which Apple
// requires us to revoke when the person deletes their account.
// Codes from the web flow must be exchanged with the same redirect URI.
export async function exchangeAppleCode(code: string, clientId: string, redirectUri?: string) {
  if (!canTalkToApple()) return null;
  const response = await fetch(`${APPLE_ISSUER}/auth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: await clientSecret(clientId),
      code,
      grant_type: "authorization_code",
      ...(redirectUri ? { redirect_uri: redirectUri } : {}),
    }),
  });
  if (!response.ok) {
    console.error("Apple code exchange failed", response.status, await response.text());
    return null;
  }
  const result = (await response.json()) as { refresh_token?: string };
  return result.refresh_token ? `${clientId}|${result.refresh_token}` : null;
}

export async function revokeAppleToken(stored: string) {
  if (!canTalkToApple()) return;
  const [clientId, refreshToken] = stored.split("|");
  if (!clientId || !refreshToken) return;
  const response = await fetch(`${APPLE_ISSUER}/auth/revoke`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: await clientSecret(clientId),
      token: refreshToken,
      token_type_hint: "refresh_token",
    }),
  });
  if (!response.ok) console.error("Apple token revoke failed", response.status);
}

// The Services ID used by Sign in with Apple on the website, and the return URL
// registered for it in the Apple Developer portal.
export function appleWebConfig(origin: string) {
  return env.APPLE_WEB_SERVICES_ID
    ? { clientId: env.APPLE_WEB_SERVICES_ID, redirectUri: `${origin}/api/auth/apple` }
    : null;
}

export function splitList(value: string | undefined) {
  return (value ?? "").split(",").map((item) => item.trim()).filter(Boolean);
}

export { APPLE_ISSUER };
