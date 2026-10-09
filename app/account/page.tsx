import type { Metadata } from "next";
import { AccountPanel } from "@/components/account-panel";
import { LegalPage } from "@/components/legal-page";
import { WebSignIn } from "@/components/web-sign-in";
import { getViewer } from "@/lib/kinwhim-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Account · Kinwhim", robots: { index: false } };

export default async function AccountPage() {
  const viewer = await getViewer().catch(() => null);
  if (!viewer) return <WebSignIn />;
  return (
    <LegalPage eyebrow="Settings" title="Account & privacy">
      <AccountPanel name={viewer.name} email={viewer.email} />
    </LegalPage>
  );
}
