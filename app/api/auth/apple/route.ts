import { cleanName, signInResponse } from "@/lib/auth/accounts";
import { APPLE_ISSUER, appleClientIds, exchangeAppleCode } from "@/lib/auth/apple";
import { TokenError, verifyIdToken } from "@/lib/auth/jwt";
import { parsePlatform, sha256Hex } from "@/lib/auth/session";
import { jsonError, readJson } from "@/lib/kinwhim-server";
import { allow, clientIp, tooMany } from "@/lib/rate-limit";

type Body = {
  identityToken: string;
  authorizationCode: string;
  nonce: string;
  givenName: string;
  familyName: string;
  platform: string;
};

export async function POST(request: Request) {
  try {
    if (!(await allow(`apple:${clientIp(request)}`, 30, 60 * 60))) return tooMany();
    const body = await readJson<Body>(request);
    if (!body.identityToken) {
      return Response.json({ error: "Apple didn’t send a sign-in token." }, { status: 400 });
    }
    const audiences = appleClientIds();
    if (!audiences.length) {
      return Response.json({ error: "Sign in with Apple isn’t set up yet." }, { status: 503 });
    }
    const claims = await verifyIdToken(body.identityToken, {
      jwksUrl: `${APPLE_ISSUER}/auth/keys`,
      issuers: [APPLE_ISSUER],
      audiences,
    });
    // The app hashes a random nonce before handing it to Apple and sends us the raw value.
    if (body.nonce && claims.nonce !== (await sha256Hex(body.nonce))) {
      throw new TokenError("Apple sign-in nonce did not match.");
    }

    const clientId = Array.isArray(claims.aud) ? claims.aud[0] : claims.aud!;
    const refreshToken = body.authorizationCode
      ? await exchangeAppleCode(body.authorizationCode, clientId)
      : null;
    // Apple only shares the name on the very first authorization.
    const name = cleanName([body.givenName, body.familyName].filter(Boolean).join(" "));

    return signInResponse(
      request,
      {
        provider: "apple",
        subject: claims.sub!,
        email: claims.email ?? null,
        emailVerified: claims.email_verified === true || claims.email_verified === "true",
        name,
        refreshToken,
      },
      parsePlatform(body.platform),
    );
  } catch (error) {
    if (error instanceof TokenError) return Response.json({ error: error.message }, { status: 401 });
    return jsonError(error);
  }
}
