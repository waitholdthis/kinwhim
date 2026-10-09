import { env } from "cloudflare:workers";
import { signInResponse } from "@/lib/auth/accounts";
import { splitList } from "@/lib/auth/apple";
import { TokenError, verifyIdToken } from "@/lib/auth/jwt";
import { parsePlatform } from "@/lib/auth/session";
import { jsonError, readJson } from "@/lib/kinwhim-server";
import { allow, clientIp, tooMany } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    if (!(await allow(`google:${clientIp(request)}`, 30, 60 * 60))) return tooMany();
    const body = await readJson<{ idToken: string; platform: string }>(request);
    if (!body.idToken) {
      return Response.json({ error: "Google didn’t send a sign-in token." }, { status: 400 });
    }
    const audiences = splitList(env.GOOGLE_CLIENT_IDS);
    if (!audiences.length) {
      return Response.json({ error: "Google sign-in isn’t set up yet." }, { status: 503 });
    }
    const claims = await verifyIdToken(body.idToken, {
      jwksUrl: "https://www.googleapis.com/oauth2/v3/certs",
      issuers: ["https://accounts.google.com", "accounts.google.com"],
      audiences,
    });
    return signInResponse(
      request,
      {
        provider: "google",
        subject: claims.sub!,
        email: claims.email ?? null,
        emailVerified: claims.email_verified === true || claims.email_verified === "true",
        name: claims.name ?? claims.given_name ?? null,
      },
      parsePlatform(body.platform),
    );
  } catch (error) {
    if (error instanceof TokenError) return Response.json({ error: error.message }, { status: 401 });
    return jsonError(error);
  }
}
