import { env } from "cloudflare:workers";
import { headers } from "next/headers";
import type { WebProviderConfig } from "@/components/web-providers";
import { appleWebConfig } from "@/lib/auth/apple";
import { publicOrigin } from "@/lib/kinwhim-server";

// Which sign-in buttons the website shows, based on configured client IDs.
export async function webProviderConfig(): Promise<WebProviderConfig> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "kinwhim.app";
  const local = host.startsWith("127.0.0.1") || host.startsWith("localhost");
  const proto = requestHeaders.get("x-forwarded-proto") ?? (local ? "http" : "https");
  return {
    google: env.GOOGLE_WEB_CLIENT_ID ? { clientId: env.GOOGLE_WEB_CLIENT_ID } : null,
    apple: appleWebConfig(publicOrigin(new Request(`${proto}://${host}/`))),
  };
}
