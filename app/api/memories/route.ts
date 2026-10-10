import { jsonError, requireCircleMember, requireViewer } from "@/lib/kinwhim-server";
import { listMemories } from "@/lib/memories";
import { addDays } from "@/lib/time";

export const dynamic = "force-dynamic";

// GET /api/memories?circle=<id>&month=YYYY-MM — one month of a circle's memories, for the calendar.
export async function GET(request: Request) {
  try {
    const viewer = await requireViewer();
    const url = new URL(request.url);
    const circleId = url.searchParams.get("circle") ?? "";
    const month = url.searchParams.get("month") ?? "";
    if (!circleId || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return Response.json({ error: "Choose a circle and a month." }, { status: 400 });
    }
    await requireCircleMember(circleId, viewer.id);
    const from = `${month}-01`;
    const [year, monthNumber] = month.split("-").map(Number);
    const nextMonth = monthNumber === 12 ? `${year + 1}-01-01` : `${year}-${String(monthNumber + 1).padStart(2, "0")}-01`;
    const memories = await listMemories({ viewerId: viewer.id, circleId, from, to: addDays(nextMonth, -1), limit: 31 });
    return Response.json({ month, memories });
  } catch (error) {
    return jsonError(error);
  }
}
