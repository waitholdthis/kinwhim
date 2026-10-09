import { generateCircleMemory } from "@/lib/generate-memory";
import { purgeExpiredSelfies, purgeOldEvidence } from "@/lib/content";
import { database, nowSeconds } from "@/lib/kinwhim-server";

type CircleRow = { id: string; timezone: string; revealHour: number; memberCount: number };

export async function runNightlyMemories() {
  const db = database();
  const circleRows = await db
    .prepare(
      `SELECT c.id, c.timezone, c.reveal_hour AS revealHour, COUNT(cm.id) AS memberCount
       FROM circles c INNER JOIN circle_members cm ON cm.circle_id = c.id
       GROUP BY c.id`,
    )
    .all<CircleRow>();
  const generated: Array<{ circleId: string; day: string; memoryId?: string }> = [];
  const skipped: Array<{ circleId: string; reason: string }> = [];
  const errors: Array<{ circleId: string; day?: string; error: string }> = [];

  for (const circle of circleRows.results) {
    const local = localClock(circle.timezone);
    const dayRows = await db
      .prepare(
        `SELECT day, COUNT(*) AS checkinCount,
                SUM(CASE WHEN consent_transform = 1 THEN 1 ELSE 0 END) AS consentingCount
         FROM checkins
         WHERE circle_id = ? AND day <= ?
           AND NOT EXISTS (
             SELECT 1 FROM memories m WHERE m.circle_id = checkins.circle_id AND m.day = checkins.day
           )
         GROUP BY day ORDER BY day DESC LIMIT 2`,
      )
      .bind(circle.id, local.day)
      .all<{ day: string; checkinCount: number; consentingCount: number }>();
    const ready = dayRows.results.find(
      (row) =>
        Number(row.checkinCount) === Number(circle.memberCount) &&
        Number(row.consentingCount) >= 2 &&
        (row.day < local.day || local.hour >= Number(circle.revealHour)),
    );
    if (!ready) {
      skipped.push({ circleId: circle.id, reason: "not ready" });
      continue;
    }
    try {
      const result = await generateCircleMemory({
        circleId: circle.id,
        day: ready.day,
        requestedBy: "kinwhim-nightly",
      });
      if (result.memoryId) generated.push({ circleId: circle.id, day: ready.day, memoryId: result.memoryId });
      else skipped.push({ circleId: circle.id, reason: "already processing" });
    } catch (error) {
      errors.push({
        circleId: circle.id,
        day: ready.day,
        error: error instanceof Error ? error.message : "Unknown generation error",
      });
    }
  }

  // Housekeeping rides along with the nightly run.
  const purgedSelfies = await purgeExpiredSelfies();
  await purgeOldEvidence();
  const now = nowSeconds();
  await db.batch([
    db.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(now),
    db.prepare("DELETE FROM email_codes WHERE expires_at < ?").bind(now),
    db.prepare("DELETE FROM rate_limits WHERE window_start < ?").bind(now - 7 * 86_400),
  ]);

  return {
    generated,
    skipped: skipped.length,
    errors,
    purgedSelfies,
    summary: generated.length
      ? `Created ${generated.length} nightly ${generated.length === 1 ? "memory" : "memories"}.`
      : "No circles were ready for a new memory.",
  };
}

function localClock(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    day: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
  };
}
