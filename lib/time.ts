// Calendar helpers. Days are "YYYY-MM-DD" strings in a circle's time zone.

export function localClock(timezone: string, at = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    day: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
    weekday: get("weekday"),
  };
}

export function addDays(day: string, amount: number) {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date + amount)).toISOString().slice(0, 10);
}

// Consecutive days ending today — or yesterday, so a streak isn't "broken"
// before today's check-in has had a chance to happen.
export function streakLength(days: Iterable<string>, today: string) {
  const set = new Set(days);
  let cursor = set.has(today) ? today : addDays(today, -1);
  let length = 0;
  while (set.has(cursor)) {
    length++;
    cursor = addDays(cursor, -1);
  }
  return length;
}
