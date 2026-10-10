import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalPage } from "@/components/legal-page";
import { ModerationDashboard } from "@/components/moderation-dashboard";
import { isAdmin } from "@/lib/admin";
import { getViewer } from "@/lib/kinwhim-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Moderation · Kinwhim", robots: { index: false } };

// Only moderators listed in ADMIN_EMAILS see this; everyone else gets a 404.
export default async function AdminPage() {
  const viewer = await getViewer().catch(() => null);
  if (!isAdmin(viewer)) notFound();
  return (
    <LegalPage eyebrow="Safety team" title="Moderation queue">
      <p className="mb-8 text-sm text-[#6d675a]">
        Review reports within 24 hours. Child-safety and self-harm reports are pinned to the top. For apparent CSAM,
        don’t download the evidence: choose Remove + suspend, then file a report with the NCMEC CyberTipline.
      </p>
      <ModerationDashboard />
    </LegalPage>
  );
}
