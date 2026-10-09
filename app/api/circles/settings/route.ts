import {
  database,
  jsonError,
  requireCircleMember,
  requireViewer,
} from "@/lib/kinwhim-server";

const STYLES = new Set(["whimsical", "cinematic", "storybook", "scrapbook"]);

export async function PATCH(request: Request) {
  try {
    const viewer = await requireViewer();
    const body = (await request.json()) as {
      circleId?: string;
      name?: string;
      revealHour?: number;
      timezone?: string;
      style?: string;
    };
    if (!body.circleId) {
      return Response.json({ error: "Circle not found." }, { status: 400 });
    }
    const membership = await requireCircleMember(body.circleId, viewer.id);
    if (membership.role !== "owner") {
      return Response.json({ error: "Only the circle keeper can change these settings." }, { status: 403 });
    }
    const name = body.name?.trim().slice(0, 48);
    const revealHour = Number(body.revealHour);
    const timezone = body.timezone?.trim().slice(0, 80);
    const style = body.style?.trim();
    if (!name || !Number.isInteger(revealHour) || revealHour < 0 || revealHour > 23) {
      return Response.json({ error: "Check the circle name and reveal time." }, { status: 400 });
    }
    if (!timezone || !isTimezone(timezone) || !style || !STYLES.has(style)) {
      return Response.json({ error: "Choose a valid time zone and memory style." }, { status: 400 });
    }
    await database()
      .prepare(
        "UPDATE circles SET name = ?, reveal_hour = ?, timezone = ?, style = ? WHERE id = ?",
      )
      .bind(name, revealHour, timezone, style, body.circleId)
      .run();
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

function isTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}
