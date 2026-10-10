// Applies drizzle/*.sql migrations to the local D1 database used by `npm run dev`,
// `npm start`, and the API tests. Applied files are recorded in a local-only
// table, so running this again only applies new migrations.
// Requires a build first (dist/server/wrangler.json).
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = path.join(root, "dist/server/wrangler.json");
if (!existsSync(config)) {
  console.error("dist/server/wrangler.json is missing. Run `npm run build` first.");
  process.exit(1);
}

export function d1(args) {
  return execFileSync(
    process.execPath,
    [
      "--import",
      "./scripts/sites-env.mjs",
      "./node_modules/wrangler/bin/wrangler.js",
      "d1",
      "execute",
      "DB",
      "--local",
      "--config",
      "dist/server/wrangler.json",
      "--persist-to",
      ".wrangler/state",
      ...args,
    ],
    { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
}

export function query(sql) {
  const output = d1(["--json", "--command", sql]);
  const parsed = JSON.parse(output.slice(output.indexOf("[")));
  return parsed[0]?.results ?? [];
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(root, "scripts/migrate-local.mjs");
if (isMain) {
  query("CREATE TABLE IF NOT EXISTS _local_migrations (name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)");
  const applied = new Set(query("SELECT name FROM _local_migrations").map((row) => row.name));

  // Databases migrated by hand before this script existed already have the
  // tables; record those files instead of replaying them.
  if (!applied.size && query("SELECT name FROM sqlite_master WHERE type='table' AND name='profiles'").length) {
    const hasAuth = query("SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'").length > 0;
    for (const name of readdirSync(path.join(root, "drizzle")).filter((file) => file.endsWith(".sql")).sort()) {
      if (name.startsWith("0003") && !hasAuth) break;
      if (name.startsWith("0004")) break;
      query(`INSERT OR IGNORE INTO _local_migrations (name, applied_at) VALUES ('${name}', ${Date.now()})`);
      applied.add(name);
    }
  }

  const files = readdirSync(path.join(root, "drizzle")).filter((file) => file.endsWith(".sql")).sort();
  let count = 0;
  for (const name of files) {
    if (applied.has(name)) continue;
    process.stdout.write(`Applying ${name}… `);
    d1(["--file", `drizzle/${name}`]);
    query(`INSERT INTO _local_migrations (name, applied_at) VALUES ('${name}', ${Date.now()})`);
    console.log("done");
    count++;
  }
  console.log(count ? `Applied ${count} migration(s).` : "Local database is up to date.");
}
