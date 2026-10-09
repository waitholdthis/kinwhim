// Minimal RS256/ES256 JWT helpers on WebCrypto, for verifying Apple and Google
// identity tokens and for signing Apple's client-secret JWT.

type Jwk = JsonWebKey & { kid?: string; alg?: string };

const jwksCache = new Map<string, { keys: Jwk[]; fetchedAt: number }>();
const JWKS_TTL_MS = 60 * 60 * 1000;

export type JwtClaims = {
  iss?: string;
  aud?: string | string[];
  sub?: string;
  exp?: number;
  iat?: number;
  nonce?: string;
  email?: string;
  email_verified?: boolean | "true" | "false";
  name?: string;
  given_name?: string;
  family_name?: string;
  is_private_email?: boolean | "true" | "false";
};

export class TokenError extends Error {}

export async function verifyIdToken(
  token: string,
  options: { jwksUrl: string; issuers: string[]; audiences: string[] },
): Promise<JwtClaims> {
  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new TokenError("Malformed identity token.");
  }
  const header = JSON.parse(textFromBase64Url(encodedHeader)) as { kid?: string; alg?: string };
  if (header.alg !== "RS256" || !header.kid) throw new TokenError("Unsupported identity token.");

  const jwk = await findKey(options.jwksUrl, header.kid);
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    bytesFromBase64Url(encodedSignature),
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
  );
  if (!valid) throw new TokenError("Identity token signature is invalid.");

  const claims = JSON.parse(textFromBase64Url(encodedPayload)) as JwtClaims;
  const now = Math.floor(Date.now() / 1000);
  if (!claims.exp || claims.exp < now - 60) throw new TokenError("Identity token has expired.");
  if (!claims.iss || !options.issuers.includes(claims.iss)) {
    throw new TokenError("Identity token issuer is not trusted.");
  }
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audiences.some((aud) => aud && options.audiences.includes(aud))) {
    throw new TokenError("Identity token was issued for a different app.");
  }
  if (!claims.sub) throw new TokenError("Identity token has no subject.");
  return claims;
}

export async function signEs256Jwt(
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
  pemPrivateKey: string,
) {
  const keyData = bytesFromBase64(
    pemPrivateKey
      .replace(/\\n/g, "\n")
      .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "")
      .replace(/\s+/g, ""),
  );
  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const signingInput = `${base64UrlFromText(JSON.stringify({ alg: "ES256", ...header }))}.${base64UrlFromText(JSON.stringify(payload))}`;
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${base64UrlFromBytes(new Uint8Array(signature))}`;
}

async function findKey(jwksUrl: string, kid: string): Promise<Jwk> {
  const cached = jwksCache.get(jwksUrl);
  const fresh = cached && Date.now() - cached.fetchedAt < JWKS_TTL_MS;
  let key = fresh ? cached.keys.find((candidate) => candidate.kid === kid) : undefined;
  if (key) return key;

  // Unknown kid: the provider may have rotated keys, so refetch once.
  const response = await fetch(jwksUrl);
  if (!response.ok) throw new TokenError("Could not reach the sign-in provider.");
  const { keys } = (await response.json()) as { keys: Jwk[] };
  jwksCache.set(jwksUrl, { keys, fetchedAt: Date.now() });
  key = keys.find((candidate) => candidate.kid === kid);
  if (!key) throw new TokenError("Identity token key is unknown.");
  return key;
}

function bytesFromBase64Url(value: string) {
  return bytesFromBase64(value.replace(/-/g, "+").replace(/_/g, "/"));
}

function bytesFromBase64(value: string) {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function textFromBase64Url(value: string) {
  return new TextDecoder().decode(bytesFromBase64Url(value));
}

function base64UrlFromBytes(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlFromText(value: string) {
  return base64UrlFromBytes(new TextEncoder().encode(value));
}
