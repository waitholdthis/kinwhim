// API tests for the Kinwhim worker. Run with `npm run test:api` (see
// tests/run-api-tests.mjs), which provides BASE_URL and test secrets.
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { describe, test } from "node:test";
import { query } from "../scripts/migrate-local.mjs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:8799";
const CRON_SECRET = process.env.TEST_CRON_SECRET ?? "test-cron-secret";
const ADMIN_TOKEN = process.env.TEST_ADMIN_TOKEN ?? "test-admin-token";
const MODERATOR = process.env.TEST_ADMIN_EMAILS ?? "moderator@kinwhim.test";
const run = randomBytes(4).toString("hex");
// A tiny valid JPEG header; the API stores bytes, it doesn't decode them.
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]);

const sql = (value) => `'${String(value).replaceAll("'", "''")}'`;

// Signs people in through the real verify endpoint. Codes are seeded straight
// into the local database (hashed exactly as the server does), so no email is sent.
async function signIn(...people) {
  const now = Math.floor(Date.now() / 1000);
  const rows = people.map(({ email }) => {
    const hash = createHash("sha256").update(`${email}:123456`).digest("hex");
    return `(${sql(randomBytes(16).toString("hex"))}, ${sql(email)}, ${sql(hash)}, 0, ${now + 600}, ${now})`;
  });
  query(`INSERT INTO email_codes (id, email, code_hash, attempts, expires_at, created_at) VALUES ${rows.join(", ")}`);
  const sessions = [];
  for (const { email, name } of people) {
    const { status, json } = await request(null, "POST", "/api/auth/email/verify", { email, code: "123456", name, platform: "ios" });
    assert.equal(status, 200, `sign-in failed for ${email}: ${JSON.stringify(json)}`);
    sessions.push({ token: json.token, id: json.user.id, email, name });
  }
  return sessions;
}

async function request(token, method, path, body) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { text };
  }
  return { status: response.status, json };
}

async function upload(token, circleId, day, consent = true) {
  const form = new FormData();
  form.set("circleId", circleId);
  form.set("day", day);
  form.set("mood", "sparkly");
  form.set("consentTransform", String(consent));
  form.set("photo", new Blob([JPEG], { type: "image/jpeg" }), "selfie.jpg");
  const response = await fetch(`${BASE}/api/checkins`, { method: "POST", headers: { authorization: `Bearer ${token}` }, body: form });
  return { status: response.status, json: await response.json() };
}

async function acceptTerms(token) {
  const me = await request(token, "GET", "/api/me");
  const result = await request(token, "POST", "/api/account/terms", { version: me.json.termsVersion, ageConfirmed: true });
  assert.equal(result.status, 200);
}

async function circleWith(owner, members, name = "Test Circle") {
  const created = await request(owner.token, "POST", "/api/circles", { action: "create", name, timezone: "UTC" });
  assert.equal(created.status, 200);
  for (const member of members) {
    const joined = await request(member.token, "POST", "/api/circles", { action: "join", code: created.json.inviteCode });
    assert.equal(joined.status, 200);
  }
  const dashboard = await request(owner.token, "GET", `/api/dashboard?circle=${created.json.circleId}`);
  return { id: created.json.circleId, inviteCode: created.json.inviteCode, today: dashboard.json.today };
}

const email = (label) => `${label}-${run}@kinwhim.test`;

describe("auth", () => {
  test("rejects missing and bogus sessions", async () => {
    assert.equal((await request(null, "GET", "/api/me")).status, 401);
    assert.equal((await request("not-a-real-token", "GET", "/api/me")).status, 401);
  });

  test("email sign-in creates a session that logout revokes", async () => {
    const [ana] = await signIn({ email: email("auth"), name: "Ana" });
    const me = await request(ana.token, "GET", "/api/me");
    assert.equal(me.status, 200);
    assert.equal(me.json.user.name, "Ana");
    assert.equal(me.json.user.needsTerms, true);
    assert.equal(me.json.user.remindersEnabled, true);
    assert.equal((await request(ana.token, "POST", "/api/auth/logout", {})).status, 200);
    assert.equal((await request(ana.token, "GET", "/api/me")).status, 401);
  });

  test("a wrong code is refused", async () => {
    const result = await request(null, "POST", "/api/auth/email/verify", { email: email("nobody"), code: "000000", platform: "ios" });
    assert.equal(result.status, 400);
  });
});

describe("circles, terms, and check-ins", () => {
  test("uploads require accepted terms; streaks follow check-ins", async () => {
    const [owner, friend] = await signIn({ email: email("owner"), name: "Owner" }, { email: email("friend"), name: "Friend" });
    const circle = await circleWith(owner, [friend]);

    const preview = await request(friend.token, "GET", `/api/invites/${circle.inviteCode}`);
    assert.equal(preview.json.circle.alreadyMember, true);

    const blocked = await upload(friend.token, circle.id, circle.today);
    assert.equal(blocked.status, 403);
    assert.equal(blocked.json.code, "terms_required");

    await acceptTerms(friend.token);
    assert.equal((await upload(friend.token, circle.id, circle.today)).status, 200);

    let dashboard = await request(friend.token, "GET", `/api/dashboard?circle=${circle.id}`);
    assert.equal(dashboard.json.streaks.mine, 1);
    assert.equal(dashboard.json.streaks.circle, 0);
    assert.ok(dashboard.json.members.find((member) => member.id === friend.id).checkedIn);
    assert.ok(!("email" in dashboard.json.members[0]), "member emails must not be exposed");

    const removed = await request(friend.token, "DELETE", "/api/checkins", { circleId: circle.id, day: circle.today });
    assert.equal(removed.status, 200);
    dashboard = await request(friend.token, "GET", `/api/dashboard?circle=${circle.id}`);
    assert.equal(dashboard.json.streaks.mine, 0);
  });

  test("invite codes are required and reset when a member is removed", async () => {
    const [keeper, guest, stranger] = await signIn(
      { email: email("keeper"), name: "Keeper" },
      { email: email("guest"), name: "Guest" },
      { email: email("stranger"), name: "Stranger" },
    );
    const circle = await circleWith(keeper, [guest]);
    assert.equal((await request(stranger.token, "POST", "/api/circles", { action: "join", code: "WINK-NOPE22" })).status, 404);
    assert.equal((await request(guest.token, "DELETE", "/api/circles/members", { circleId: circle.id, userId: keeper.id })).status, 403);

    const removal = await request(keeper.token, "DELETE", "/api/circles/members", { circleId: circle.id, userId: guest.id });
    assert.equal(removal.status, 200);
    assert.notEqual(removal.json.inviteCode, circle.inviteCode);
    assert.equal((await request(guest.token, "POST", "/api/circles", { action: "join", code: circle.inviteCode })).status, 404);
  });
});

describe("safety", () => {
  test("reporting a selfie can block the person, hiding their photo", async () => {
    const [reporter, reported] = await signIn({ email: email("reporter"), name: "Reporter" }, { email: email("reported"), name: "Reported" });
    const circle = await circleWith(reporter, [reported]);
    await acceptTerms(reported.token);
    await upload(reported.token, circle.id, circle.today);

    let dashboard = await request(reporter.token, "GET", `/api/dashboard?circle=${circle.id}`);
    const target = dashboard.json.members.find((member) => member.id === reported.id);
    assert.ok(target.photoUrl);

    const report = await request(reporter.token, "POST", "/api/reports", {
      targetType: "photo",
      targetId: target.checkinId,
      reason: "harassment_or_bullying",
      details: "test",
      block: true,
    });
    assert.equal(report.status, 200);
    assert.equal(report.json.blocked, true);

    dashboard = await request(reporter.token, "GET", `/api/dashboard?circle=${circle.id}`);
    const after = dashboard.json.members.find((member) => member.id === reported.id);
    assert.equal(after.blocked, true);
    assert.equal(after.photoUrl, null);
    assert.equal((await request(reporter.token, "GET", "/api/blocks")).json.blocked.length, 1);

    assert.equal((await request(reporter.token, "POST", "/api/reports", { targetType: "photo", targetId: target.checkinId, reason: "made_up" })).status, 400);
  });

  test("account deletion signs the person out and removes their data", async () => {
    const [leaver, stayer] = await signIn({ email: email("leaver"), name: "Leaver" }, { email: email("stayer"), name: "Stayer" });
    const circle = await circleWith(leaver, [stayer]);
    await acceptTerms(leaver.token);
    await upload(leaver.token, circle.id, circle.today);

    assert.equal((await request(leaver.token, "DELETE", "/api/account", {})).status, 400, "requires confirmation");
    assert.equal((await request(leaver.token, "DELETE", "/api/account", { confirm: "DELETE" })).status, 200);
    assert.equal((await request(leaver.token, "GET", "/api/me")).status, 401);
    assert.equal(query(`SELECT COUNT(*) AS n FROM checkin_log WHERE user_id = ${sql(leaver.id)}`)[0].n, 0);
    assert.equal(query(`SELECT COUNT(*) AS n FROM profiles WHERE id = ${sql(leaver.id)}`)[0].n, 0);

    const dashboard = await request(stayer.token, "GET", `/api/dashboard?circle=${circle.id}`);
    assert.equal(dashboard.json.circle.ownerId, stayer.id, "keeper role passes to the remaining member");
  });
});

describe("nudges", () => {
  test("the last friend left gets exactly one nudge", async () => {
    const [a, b, c] = await signIn(
      { email: email("nudge-a"), name: "A" },
      { email: email("nudge-b"), name: "B" },
      { email: email("nudge-c"), name: "C" },
    );
    const circle = await circleWith(a, [b, c]);
    await acceptTerms(a.token);
    await acceptTerms(b.token);
    await upload(a.token, circle.id, circle.today);
    const count = () =>
      query(`SELECT COUNT(*) AS n FROM notification_log WHERE user_id = ${sql(c.id)} AND kind = 'last_one' AND circle_id = ${sql(circle.id)}`)[0].n;
    assert.equal(count(), 0, "two people still missing");
    await upload(b.token, circle.id, circle.today);
    assert.equal(count(), 1);
    await upload(b.token, circle.id, circle.today); // a retake must not nudge again
    assert.equal(count(), 1);
  });

  test("scheduled reminders go out once, only to people who want them", async () => {
    const [owner, quiet] = await signIn({ email: email("remind-owner"), name: "Owner" }, { email: email("remind-quiet"), name: "Quiet" });
    const circle = await circleWith(owner, [quiet]);
    // Pick a time zone where it's currently noon, and reveal at 1 PM, so the
    // reminder window (11 AM–1 PM) is open right now.
    const offset = new Date().getUTCHours() - 12;
    const timezone = offset === 0 ? "Etc/GMT" : offset > 0 ? `Etc/GMT+${offset}` : `Etc/GMT${offset}`;
    const settings = await request(owner.token, "PATCH", "/api/circles/settings", {
      circleId: circle.id,
      name: "Reminder Circle",
      revealHour: 13,
      timezone,
      style: "whimsical",
    });
    assert.equal(settings.status, 200, JSON.stringify(settings.json));
    assert.equal((await request(quiet.token, "PATCH", "/api/me", { remindersEnabled: false })).status, 200);

    assert.equal((await request(null, "POST", "/api/cron/nightly")).status, 401);
    const cron = async () => {
      const result = await request(CRON_SECRET, "POST", "/api/cron/nightly");
      assert.equal(result.status, 200, JSON.stringify(result.json));
    };
    await cron();
    await cron();
    const reminders = (userId) =>
      query(`SELECT COUNT(*) AS n FROM notification_log WHERE user_id = ${sql(userId)} AND kind = 'reminder' AND circle_id = ${sql(circle.id)}`)[0].n;
    assert.equal(reminders(owner.id), 1);
    assert.equal(reminders(quiet.id), 0);
  });
});

describe("memories calendar", () => {
  test("lists a month for members only", async () => {
    const [member, outsider] = await signIn({ email: email("cal-member"), name: "Member" }, { email: email("cal-outsider"), name: "Outsider" });
    const circle = await circleWith(member, []);
    const month = circle.today.slice(0, 7);
    const list = await request(member.token, "GET", `/api/memories?circle=${circle.id}&month=${month}`);
    assert.equal(list.status, 200);
    assert.deepEqual(list.json.memories, []);
    assert.equal((await request(member.token, "GET", `/api/memories?circle=${circle.id}&month=2026-13`)).status, 400);
    assert.equal((await request(outsider.token, "GET", `/api/memories?circle=${circle.id}&month=${month}`)).status, 403);
    assert.equal((await request(member.token, "GET", "/api/memories/does-not-exist")).status, 404);
  });
});

describe("moderation", () => {
  test("only moderators and the admin token can use the queue", async () => {
    const [moderator, regular] = await signIn({ email: MODERATOR, name: "Moderator" }, { email: email("regular"), name: "Regular" });
    assert.equal((await request(regular.token, "GET", "/api/admin/reports")).status, 401);
    assert.equal((await request(null, "GET", "/api/admin/reports")).status, 401);

    const queue = await request(moderator.token, "GET", "/api/admin/reports?status=open");
    assert.equal(queue.status, 200);
    assert.ok(Array.isArray(queue.json.reports));
    assert.equal(typeof queue.json.counts, "object");
    assert.equal((await request(ADMIN_TOKEN, "GET", "/api/admin/reports")).status, 200);

    const page = async (token) => (await fetch(`${BASE}/admin`, { headers: { authorization: `Bearer ${token}` } })).status;
    assert.equal(await page(regular.token), 404);
    assert.equal(await page(moderator.token), 200);

    const report = queue.json.reports[0];
    if (report) {
      const resolved = await request(moderator.token, "POST", `/api/admin/reports/${report.id}`, { action: "dismiss", note: "test run" });
      assert.equal(resolved.status, 200);
    }
  });
});
