import { removeMember } from "@/lib/content";
import { rotateInviteCode } from "@/lib/invites";
import { jsonError, readJson, requireCircleMember, requireViewer } from "@/lib/kinwhim-server";

// Leave a circle (userId = yourself) or, as keeper, remove someone else.
export async function DELETE(request: Request) {
  try {
    const viewer = await requireViewer();
    const body = await readJson<{ circleId: string; userId: string }>(request);
    if (!body.circleId || !body.userId) {
      return Response.json({ error: "Choose who to remove." }, { status: 400 });
    }
    const membership = await requireCircleMember(body.circleId, viewer.id);
    const leaving = body.userId === viewer.id;
    if (!leaving && membership.role !== "owner") {
      return Response.json({ error: "Only the circle keeper can remove people." }, { status: 403 });
    }
    if (!leaving) await requireCircleMember(body.circleId, body.userId);
    await removeMember(body.circleId, body.userId);
    // A removed person still knows the old code, so retire it.
    const inviteCode = leaving ? null : await rotateInviteCode(body.circleId);
    return Response.json({ ok: true, inviteCode });
  } catch (error) {
    return jsonError(error);
  }
}
