import { clearSessionCookie } from "@/lib/auth/session";
import { deleteAccount } from "@/lib/content";
import { jsonError, readJson, requireViewer } from "@/lib/kinwhim-server";

// Permanently deletes the account and everything tied to it: sessions,
// sign-in identities (revoking Sign in with Apple), selfies, memories that
// feature the person, reactions, push tokens, and circle memberships.
export async function DELETE(request: Request) {
  try {
    const viewer = await requireViewer();
    const body = await readJson<{ confirm: string }>(request);
    if (body.confirm !== "DELETE") {
      return Response.json({ error: "Confirm account deletion to continue." }, { status: 400 });
    }
    await deleteAccount(viewer.id);
    const secure = new URL(request.url).protocol === "https:";
    return Response.json({ ok: true }, { headers: { "set-cookie": clearSessionCookie(secure) } });
  } catch (error) {
    return jsonError(error);
  }
}
