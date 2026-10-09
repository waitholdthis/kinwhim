import { env } from "cloudflare:workers";
import { splitList } from "@/lib/auth/apple";

// Universal links: https://kinwhim.app/join/<code> and /memory/<id> open the iOS app.
export function GET() {
  const appIDs = splitList(env.APPLE_APP_IDS);
  return Response.json(
    {
      applinks: {
        details: [
          {
            appIDs,
            components: [
              { "/": "/join/*", comment: "Circle invitations" },
              { "/": "/memory/*", comment: "Shared memories" },
            ],
          },
        ],
      },
      webcredentials: { apps: appIDs },
    },
    { headers: { "cache-control": "public, max-age=3600" } },
  );
}
