import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { PRIVACY_EMAIL, SAFETY_EMAIL, SELFIE_RETENTION_DAYS, SUPPORT_EMAIL } from "@/lib/policies";

export const metadata: Metadata = {
  title: "Help & Safety · Kinwhim",
  description: "Get help with Kinwhim, report a problem, and learn how reporting, blocking, and deletion work.",
};

export default function SupportPage() {
  return (
    <LegalPage eyebrow="Kinwhim support" title="Help & safety">
      <h2>Contact us</h2>
      <ul>
        <li>General help: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></li>
        <li>Safety, abuse, or moderation appeals: <a href={`mailto:${SAFETY_EMAIL}`}>{SAFETY_EMAIL}</a> (we review safety reports within 24 hours)</li>
        <li>Privacy and data requests: <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a></li>
      </ul>
      <p>If someone is in immediate danger, contact local emergency services first.</p>

      <h2>Report a photo, memory, or person</h2>
      <ul>
        <li><strong>A selfie</strong>: on Today, press and hold the friend’s photo, then tap Report.</li>
        <li><strong>A memory</strong>: open it, tap ••• then Report memory.</li>
        <li><strong>A person</strong>: Circle → tap their name → Report.</li>
      </ul>
      <p>
        Reports go to our moderation team, not to the person you reported. A reported memory disappears from
        your shelf right away while we review it.
      </p>

      <h2>Block someone</h2>
      <p>
        Circle → tap their name → Block, or choose “Also block” while reporting. Blocking works both ways:
        neither of you sees the other’s selfies, and you won’t appear together in new memories. Manage blocked
        people in Settings → Blocked people.
      </p>

      <h2>Remove someone or leave a circle</h2>
      <p>
        The circle keeper can remove anyone (Circle → tap their name → Remove from circle). Removing someone
        resets the invite code so the old one stops working. Anyone can leave a circle from Circle → Leave
        circle; your selfies in that circle are deleted when you leave.
      </p>

      <h2>Delete selfies, memories, or your account</h2>
      <ul>
        <li>Raw selfies delete themselves {SELFIE_RETENTION_DAYS} days after they were taken.</li>
        <li>Delete today’s selfie from the check-in screen, or every selfie from Settings → Delete all my selfies.</li>
        <li>The circle keeper, or anyone in a memory, can delete it: open the memory → ••• → Delete.</li>
        <li>Delete your account from Settings → Delete account, or at <a href="/delete-account">kinwhim.app/delete-account</a>.</li>
      </ul>

      <h2>Common questions</h2>
      <h3>Why didn’t tonight’s memory appear?</h3>
      <p>
        Everyone in the circle needs to check in, and at least two people need the AI transform switched on.
        The memory is made after the circle’s reveal time.
      </p>
      <h3>Can people outside my circle see my photos?</h3>
      <p>No. Photos are only served to signed-in members of the circle they were shared in.</p>
      <h3>Can I use Kinwhim without the AI?</h3>
      <p>
        Yes. Switch off “Transform my selfie” when you check in. Your friends still see your selfie, but it
        won’t be sent to the AI provider or included in the memory.
      </p>
      <h3>I lost access to my email or Apple ID</h3>
      <p>Write to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> from an address we can verify, and we’ll help.</p>

      <p className="mt-10">
        Read the <a href="/privacy">Privacy Policy</a>, <a href="/terms">Terms of Use</a>, and{" "}
        <a href="/safety">Child Safety Standards</a>.
      </p>
    </LegalPage>
  );
}
