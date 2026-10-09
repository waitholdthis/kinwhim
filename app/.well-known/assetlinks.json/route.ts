import { env } from "cloudflare:workers";
import { splitList } from "@/lib/auth/apple";

// Android App Links for the same /join and /memory URLs.
export function GET() {
  const fingerprints = splitList(env.ANDROID_CERT_SHA256);
  return Response.json(
    fingerprints.length
      ? [
          {
            relation: ["delegate_permission/common.handle_all_urls"],
            target: {
              namespace: "android_app",
              package_name: env.ANDROID_PACKAGE || "app.kinwhim",
              sha256_cert_fingerprints: fingerprints,
            },
          },
        ]
      : [],
    { headers: { "cache-control": "public, max-age=3600" } },
  );
}
