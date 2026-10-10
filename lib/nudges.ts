import { database, nowSeconds } from "@/lib/kinwhim-server";
import { sendPush } from "@/lib/push";
import { addDays, localClock } from "@/lib/time";

type NudgeKind = "reminder" | "last_one" | "weekly";

// Hours before the reveal when the "haven't checked in yet" reminder goes out.
const REMINDER_LEAD_HOURS = 2;

// Claims the right to send one nudge. The unique index makes this the dedupe:
// only the first caller for a person/kind/circle/day gets `true`.
async function claim(userId: string, kind: NudgeKind, circleId: string, day: string) {
  const result = await database()
    .prepare(
      `INSERT OR IGNORE INTO notification_log (id, user_id, kind, circle_id, day, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(crypto.randomUUID(), userId, kind, circleId, day, nowSeconds())
    .run();
  return Number(result.meta.changes ?? 0) > 0;
}

async function claimAll(userIds: string[], kind: NudgeKind, circleId: string, day: string) {
  const claimed: string[] = [];
  for (const userId of userIds) {
    if (await claim(userId, kind, circleId, day)) claimed.push(userId);
  }
  return claimed;
}

type CircleRow = { id: string; name: string; timezone: string; revealHour: number };

async function circles() {
  const rows = await database()
    .prepare("SELECT id, name, timezone, reveal_hour AS revealHour FROM circles")
    .all<CircleRow>();
  return rows.results;
}

// Members who still owe today's selfie and haven't turned reminders off.
async function missingMembers(circleId: string, day: string) {
  const rows = await database()
    .prepare(
      `SELECT cm.user_id AS userId
       FROM circle_members cm
       INNER JOIN profiles p ON p.id = cm.user_id
       WHERE cm.circle_id = ? AND p.reminders_enabled = 1
         AND NOT EXISTS (
           SELECT 1 FROM checkins c WHERE c.circle_id = cm.circle_id AND c.user_id = cm.user_id AND c.day = ?
         )`,
    )
    .bind(circleId, day)
    .all<{ userId: string }>();
  return rows.results.map((row) => row.userId);
}

function hourLabel(hour: number) {
  const suffix = hour < 12 ? "AM" : "PM";
  return `${hour % 12 === 0 ? 12 : hour % 12} ${suffix}`;
}

// Runs hourly. In the hours just before a circle's reveal, reminds anyone who
// hasn't checked in; on Sunday evenings, recaps the week's memories.
export async function runScheduledNudges(at = new Date()) {
  let reminders = 0;
  let recaps = 0;
  for (const circle of await circles()) {
    const local = localClock(circle.timezone, at);
    const reveal = Number(circle.revealHour);

    if (reveal >= REMINDER_LEAD_HOURS && local.hour >= reveal - REMINDER_LEAD_HOURS && local.hour < reveal) {
      const missing = await missingMembers(circle.id, local.day);
      const recipients = await claimAll(missing, "reminder", circle.id, local.day);
      if (recipients.length) {
        await sendPush(recipients, {
          title: circle.name,
          body: `Tonight’s world reveals at ${hourLabel(reveal)}. Snap today’s selfie 📸`,
          data: { url: "kinwhim://checkin", circleId: circle.id, screen: "checkin" },
        });
        reminders += recipients.length;
      }
    }

    if (local.weekday === "Sun" && local.hour >= 18) {
      const week = await database()
        .prepare("SELECT COUNT(*) AS count FROM memories WHERE circle_id = ? AND day > ? AND day <= ?")
        .bind(circle.id, addDays(local.day, -7), local.day)
        .first<{ count: number }>();
      const count = Number(week?.count ?? 0);
      if (count > 0) {
        const members = await database()
          .prepare(
            `SELECT cm.user_id AS userId FROM circle_members cm
             INNER JOIN profiles p ON p.id = cm.user_id
             WHERE cm.circle_id = ? AND p.reminders_enabled = 1`,
          )
          .bind(circle.id)
          .all<{ userId: string }>();
        const recipients = await claimAll(members.results.map((row) => row.userId), "weekly", circle.id, local.day);
        if (recipients.length) {
          await sendPush(recipients, {
            title: `${circle.name}’s week`,
            body: `${count} little ${count === 1 ? "world" : "worlds"} this week. Take a look back ✨`,
            data: { url: "kinwhim://memories", circleId: circle.id, screen: "memories" },
          });
          recaps += recipients.length;
        }
      }
    }
  }
  return { reminders, recaps };
}

// After a check-in: if exactly one friend is still missing, give them a nudge.
export async function nudgeLastOne(circleId: string, day: string) {
  const db = database();
  const circle = await db
    .prepare(
      `SELECT c.name, (SELECT COUNT(*) FROM circle_members WHERE circle_id = c.id) AS memberCount
       FROM circles c WHERE c.id = ?`,
    )
    .bind(circleId)
    .first<{ name: string; memberCount: number }>();
  if (!circle || Number(circle.memberCount) < 2) return;
  const missing = await db
    .prepare(
      `SELECT cm.user_id AS userId, p.reminders_enabled AS enabled
       FROM circle_members cm INNER JOIN profiles p ON p.id = cm.user_id
       WHERE cm.circle_id = ?
         AND NOT EXISTS (SELECT 1 FROM checkins c WHERE c.circle_id = cm.circle_id AND c.user_id = cm.user_id AND c.day = ?)`,
    )
    .bind(circleId, day)
    .all<{ userId: string; enabled: number }>();
  if (missing.results.length !== 1 || !Number(missing.results[0].enabled)) return;
  const [last] = missing.results;
  if (!(await claim(last.userId, "last_one", circleId, day))) return;
  await sendPush([last.userId], {
    title: circle.name,
    body: "Everyone else is in. Tonight’s world is waiting on your selfie ✨",
    data: { url: "kinwhim://checkin", circleId, screen: "checkin" },
  });
}
