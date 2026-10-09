import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { CURRENT_TERMS_VERSION, MINIMUM_AGE, SAFETY_EMAIL } from "@/lib/policies";

export const metadata: Metadata = {
  title: "Child Safety Standards · Kinwhim",
  description: "Kinwhim’s standards against child sexual abuse and exploitation (CSAE).",
};

export default function SafetyPage() {
  return (
    <LegalPage eyebrow="Kinwhim" title="Child Safety Standards" updated={CURRENT_TERMS_VERSION}>
      <p>
        Kinwhim prohibits child sexual abuse and exploitation (CSAE) and child sexual abuse material (CSAM) of
        any kind. These standards apply to every photo, caption, memory, and account on Kinwhim.
      </p>

      <h2>Our standards</h2>
      <ul>
        <li>Kinwhim is for people {MINIMUM_AGE} and older. Accounts we learn belong to younger children are deleted.</li>
        <li>Any content that sexualizes a minor, grooms, solicits, or exploits a child is prohibited and removed.</li>
        <li>Accounts involved in CSAE are permanently banned.</li>
        <li>Our AI image generation tells the model to keep people fully clothed in safe, everyday scenes, and our AI provider applies its own safety systems that block sexual content involving minors.</li>
      </ul>

      <h2>How to report</h2>
      <p>
        Report any photo, memory, or person in the app (press and hold, or tap •••, then Report, and choose
        “Child safety concern”), or email <a href={`mailto:${SAFETY_EMAIL}`}>{SAFETY_EMAIL}</a>. Child safety
        reports are prioritized and reviewed as quickly as possible, and always within 24 hours.
      </p>

      <h2>What we do</h2>
      <ul>
        <li>Reported content is preserved privately for review and removed from the service.</li>
        <li>We report apparent CSAM to the National Center for Missing &amp; Exploited Children (NCMEC) and cooperate with law enforcement, as the law requires.</li>
        <li>We comply with applicable child safety laws in every region where Kinwhim is available.</li>
      </ul>

      <h2>Child safety contact</h2>
      <p>
        Our designated child safety contact can be reached at{" "}
        <a href={`mailto:${SAFETY_EMAIL}`}>{SAFETY_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
