import type { Metadata } from "next";
import { AccountPanel } from "@/components/account-panel";
import { LegalPage } from "@/components/legal-page";
import { WebSignIn } from "@/components/web-sign-in";
import { database, getViewer } from "@/lib/kinwhim-server";
import { webProviderConfig } from "@/lib/web-providers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Account · Kinwhim", robots: { index: false } };

export default async function AccountPage() {
  const viewer = await getViewer().catch(() => null);
  if (!viewer) return <WebSignIn providers={await webProviderConfig()} />;
  return (
    <LegalPage eyebrow="Settings" title="Account & privacy">
      <AccountPanel name={viewer.name} email={viewer.email} blocked={await blockedPeople(viewer.id)} remindersEnabled={await remindersEnabled(viewer.id)} />
    </LegalPage>
  );
}

async function blockedPeople(userId: string) {
  const rows = await database()
    .prepare(
      `SELECT b.blocked_id AS id, COALESCE(p.display_name, 'Former member') AS name
       FROM user_blocks b LEFT JOIN profiles p ON p.id = b.blocked_id
       WHERE b.blocker_id = ? ORDER BY b.created_at DESC`,
    )
    .bind(userId)
    .all<{ id: string; name: string }>();
  return rows.results;
}

async function remindersEnabled(userId: string) {
  const row = await database()
    .prepare("SELECT reminders_enabled AS enabled FROM profiles WHERE id = ?")
    .bind(userId)
    .first<{ enabled: number }>();
  return Boolean(row?.enabled ?? 1);
}
