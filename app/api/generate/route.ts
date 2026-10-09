import { generateCircleMemory, GenerationError } from "@/lib/generate-memory";
import { jsonError, requireCircleMember, requireViewer } from "@/lib/kinwhim-server";

export async function POST(request: Request) {
  try {
    const viewer = await requireViewer();
    const body = (await request.json()) as { circleId?: string; day?: string };
    if (!body.circleId || !body.day) {
      return Response.json({ error: "Choose a circle and day." }, { status: 400 });
    }
    await requireCircleMember(body.circleId, viewer.id);
    const result = await generateCircleMemory({
      circleId: body.circleId,
      day: body.day,
      requestedBy: viewer.id,
    });
    return Response.json(result, { status: result.pending ? 202 : 200 });
  } catch (error) {
    if (error instanceof GenerationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return jsonError(error);
  }
}
