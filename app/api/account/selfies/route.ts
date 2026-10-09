import { deleteCheckins } from "@/lib/content";
import { jsonError, requireViewer } from "@/lib/kinwhim-server";

// Deletes every raw selfie this person has uploaded, in every circle.
export async function DELETE() {
  try {
    const viewer = await requireViewer();
    await deleteCheckins({ userId: viewer.id });
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
