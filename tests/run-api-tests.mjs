// Runs the API test suite against the built worker:
//   npm run build && npm run test:api
// Applies pending local migrations, starts the worker on a spare port with
// test-only secrets, runs tests/api.test.mjs, then stops the worker.
import { execFileSync, spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.TEST_PORT ?? 8799);
const baseUrl = `http://127.0.0.1:${port}`;
const secrets = {
  CRON_SECRET: "test-cron-secret",
  ADMIN_TOKEN: "test-admin-token",
  ADMIN_EMAILS: "moderator@kinwhim.test",
};

execFileSync(process.execPath, ["scripts/migrate-local.mjs"], { cwd: root, stdio: "inherit" });

const server = spawn(
  process.execPath,
  [
    "--import",
    "./scripts/sites-env.mjs",
    "./node_modules/wrangler/bin/wrangler.js",
    "dev",
    "--config",
    "dist/server/wrangler.json",
    "--local",
    "--persist-to",
    ".wrangler/state",
    "--ip",
    "127.0.0.1",
    "--port",
    String(port),
    "--inspector-port",
    "0",
    ...Object.entries(secrets).flatMap(([key, value]) => ["--var", `${key}:${value}`]),
  ],
  { cwd: root, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, WRANGLER_SEND_METRICS: "false" } },
);
let serverLog = "";
server.stdout.on("data", (chunk) => (serverLog += chunk));
server.stderr.on("data", (chunk) => (serverLog += chunk));

function stopServer() {
  if (server.exitCode !== null) return;
  if (process.platform === "win32") {
    try {
      execFileSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
    } catch {
      // Already gone.
    }
  } else {
    server.kill("SIGTERM");
  }
}
process.on("exit", stopServer);
process.on("SIGINT", () => process.exit(130));

async function waitForServer() {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Worker exited early:\n${serverLog}`);
    try {
      const response = await fetch(`${baseUrl}/privacy`);
      if (response.ok) return;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Worker did not start within 90s:\n${serverLog}`);
}

let exitCode = 1;
try {
  await waitForServer();
  const tests = spawn(process.execPath, ["--test", "--test-reporter=spec", "tests/api.test.mjs"], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, BASE_URL: baseUrl, ...Object.fromEntries(Object.entries(secrets).map(([k, v]) => [`TEST_${k}`, v])) },
  });
  exitCode = await new Promise((resolve) => tests.on("exit", (code) => resolve(code ?? 1)));
  if (exitCode !== 0 && process.env.CI) console.log(`\n--- worker log ---\n${serverLog.slice(-8000)}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
} finally {
  stopServer();
}
process.exit(exitCode);
