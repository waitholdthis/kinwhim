import { Redirect, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { useSession } from "@/lib/session";

// Handles https://kinwhim.app/join/<code> and kinwhim://join/<code>.
export default function JoinLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { status, setPendingInvite } = useSession();
  const normalized = String(code ?? "").trim().toUpperCase();

  useEffect(() => {
    if (status === "signedOut" && normalized) setPendingInvite(normalized);
  }, [normalized, setPendingInvite, status]);

  if (status === "loading") return null;
  if (status === "signedOut") return <Redirect href="/sign-in" />;
  return <Redirect href={{ pathname: "/new-circle", params: { code: normalized } }} />;
}
