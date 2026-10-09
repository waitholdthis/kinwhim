import { env } from "cloudflare:workers";
import { requireSecret } from "@/lib/admin";
import { jsonError } from "@/lib/kinwhim-server";
import { runNightlyMemories } from "@/lib/nightly-memories";

// Call hourly from any scheduler with `Authorization: Bearer $CRON_SECRET`.
// Each circle is processed once its own reveal hour has passed.
export async function POST(request: Request) {
  try {
    requireSecret(request, env.CRON_SECRET);
    return Response.json(await runNightlyMemories());
  } catch (error) {
    return jsonError(error);
  }
}
