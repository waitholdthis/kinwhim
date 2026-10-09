import {
  blockedUserIds,
  bucket,
  jsonError,
  requireCircleMember,
  requireViewer,
} from "@/lib/kinwhim-server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string }> },
) {
  try {
    const viewer = await requireViewer();
    const { key } = await context.params;
    const decodedKey = decodeURIComponent(key);
    // Moderation evidence is only served through the admin API.
    if (decodedKey.startsWith("report:")) return new Response("Not found", { status: 404 });
    const object = await bucket().get(decodedKey);
    if (!object) return new Response("Not found", { status: 404 });
    const circleId = object.customMetadata?.circleId;
    if (!circleId) return new Response("Not found", { status: 404 });
    await requireCircleMember(circleId, viewer.id);
    const ownerId = object.customMetadata?.userId;
    if (ownerId && (await blockedUserIds(viewer.id)).has(ownerId)) {
      return new Response("Not found", { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("cache-control", "private, max-age=300");
    headers.set("x-content-type-options", "nosniff");
    return new Response(object.body, { headers });
  } catch (error) {
    return jsonError(error);
  }
}
