import { rotateInviteCode } from "@/lib/invites";
import { jsonError, readJson, requireCircleMember, requireViewer } from "@/lib/kinwhim-server";

// The keeper can retire the current invite code; old links stop working.
export async function POST(request: Request) {
  try {
    const viewer = await requireViewer();
    const body = await readJson<{ circleId: string }>(request);
    if (!body.circleId) return Response.json({ error: "Circle not found." }, { status: 400 });
    const membership = await requireCircleMember(body.circleId, viewer.id);
    if (membership.role !== "owner") {
      return Response.json({ error: "Only the circle keeper can reset the invite." }, { status: 403 });
    }
    return Response.json({ inviteCode: await rotateInviteCode(body.circleId) });
  } catch (error) {
    return jsonError(error);
  }
}
