import { Redirect } from "expo-router";
import { useSession } from "@/lib/session";

export default function Index() {
  const { status, pendingInvite } = useSession();
  if (status === "loading") return null;
  if (status === "signedOut") return <Redirect href="/sign-in" />;
  if (pendingInvite) return <Redirect href={{ pathname: "/new-circle", params: { code: pendingInvite } }} />;
  return <Redirect href="/today" />;
}
