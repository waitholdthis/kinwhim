import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { PRIVACY_EMAIL } from "@/lib/policies";

export const metadata: Metadata = {
  title: "Delete your Kinwhim account",
  description: "How to delete your Kinwhim account and what data is removed.",
};

// Public page linked from Google Play's Data safety section and the Privacy Policy.
export default async function DeleteAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string }>;
}) {
  const { done } = await searchParams;
  return (
    <LegalPage eyebrow="Kinwhim" title={done ? "Your account was deleted." : "Delete your account"}>
      {done ? (
        <p>Everything tied to your account has been removed. Thank you for spending time with your people on Kinwhim.</p>
      ) : (
        <>
          <h2>In the app (fastest)</h2>
          <p>Open Kinwhim → Settings → Delete account, then confirm. Deletion happens immediately.</p>

          <h2>On the web</h2>
          <p>
            Go to <a href="/account">kinwhim.app/account</a>, sign in with the email on your account, and choose
            Delete my account.
          </p>

          <h2>By email</h2>
          <p>
            If you signed in with Apple or Google and can’t open the app, email{" "}
            <a href={`mailto:${PRIVACY_EMAIL}?subject=Delete%20my%20Kinwhim%20account`}>{PRIVACY_EMAIL}</a> from
            the address on your account with the subject “Delete my Kinwhim account.” We’ll confirm it’s you and
            delete the account within 7 days.
          </p>

          <h2>What gets deleted</h2>
          <ul>
            <li>Your profile, name, email, and sign-in methods (we also revoke Sign in with Apple access)</li>
            <li>All of your selfies, moods, and captions</li>
            <li>Every memory you appear in, for everyone in the circle</li>
            <li>Your reactions, notification settings, push tokens, and blocks</li>
            <li>Your circle memberships. Circles you keep pass to the longest-standing member, and empty circles are deleted.</li>
          </ul>

          <h2>What we keep</h2>
          <p>
            Deleted data may remain in encrypted backups for up to 30 days. If you were the subject of a safety
            report that led to action, we keep that report and its evidence for up to one year to prevent repeat
            abuse, and longer only if the law requires it.
          </p>
        </>
      )}
    </LegalPage>
  );
}
