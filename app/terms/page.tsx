import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import {
  CURRENT_TERMS_VERSION,
  GOVERNING_LAW,
  LEGAL_ENTITY,
  MINIMUM_AGE,
  SAFETY_EMAIL,
  SUPPORT_EMAIL,
} from "@/lib/policies";

export const metadata: Metadata = {
  title: "Terms of Use · Kinwhim",
  description: "The rules for using Kinwhim, including our zero-tolerance policy for objectionable content.",
};

export default function TermsPage() {
  return (
    <LegalPage eyebrow="Kinwhim" title="Terms of Use" updated={CURRENT_TERMS_VERSION}>
      <p>
        These terms are an agreement between you and {LEGAL_ENTITY} (“Kinwhim”, “we”) about using the Kinwhim
        apps and website. By creating an account or uploading a photo, you agree to them and to our{" "}
        <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>1. Who can use Kinwhim</h2>
      <p>
        You must be at least {MINIMUM_AGE} years old, and old enough to consent to data processing where you
        live (16 in some countries). If you’re under 18, you need a parent or guardian’s permission. You may
        not use Kinwhim if we’ve previously suspended you.
      </p>

      <h2>2. Your account</h2>
      <p>
        You can sign in with Apple, Google, or an emailed code. Keep access to your sign-in method secure;
        you’re responsible for activity on your account. You can delete your account at any time in the app
        or at <a href="/delete-account">kinwhim.app/delete-account</a>.
      </p>

      <h2>3. Circles are invitation-only</h2>
      <p>
        A circle is a private group of up to 10 people. Anyone with a circle’s invite code can join it, so only
        share codes with people you trust. The circle keeper can reset the code and remove members at any
        time.
      </p>

      <h2>4. Your photos and content</h2>
      <ul>
        <li>You keep ownership of the selfies, captions, and other content you share.</li>
        <li>
          You give Kinwhim a limited, non-exclusive, royalty-free license to store, display, and process your
          content, including sending it to our AI provider when you opt in, only to operate Kinwhim for you and
          your circles. This license ends when the content is deleted.
        </li>
        <li>
          Only upload photos of yourself. If anyone else is clearly visible, you must have their permission.
          Never upload photos of someone else in place of your own selfie.
        </li>
        <li>
          Memories are AI-generated illustrations. They may be imperfect, surprising, or inaccurate, and they
          don’t represent real events. Members of a circle may save and share that circle’s memories. Please
          respect your friends’ wishes about where their likeness ends up.
        </li>
      </ul>

      <h2>5. Zero tolerance for objectionable content and abuse</h2>
      <p>Kinwhim has no tolerance for objectionable content or abusive users. You may not upload, generate, or share:</p>
      <ul>
        <li>Nudity, sexual content, or sexualized images of anyone, and never anything involving a minor.</li>
        <li>Harassment, bullying, threats, hate speech, or content that degrades people based on who they are.</li>
        <li>Violence, self-harm promotion, illegal activity, or dangerous acts.</li>
        <li>Photos of other people without consent, impersonation, or attempts to deceive.</li>
        <li>Spam, malware, or attempts to break, scrape, or overload Kinwhim.</li>
      </ul>
      <p>
        You also may not use Kinwhim’s AI to try to create content that breaks these rules, or try to work
        around our safeguards.
      </p>

      <h2>6. Reporting, blocking, and moderation</h2>
      <p>
        You can report any photo, memory, or person, and block anyone, from inside the app. Blocked people
        can’t see your selfies and won’t appear in new memories with you. We review reports within 24 hours.
        We may remove content, remove people from circles, and suspend or ban accounts that break these terms,
        and we report child sexual abuse material to the authorities. Questions about a moderation decision go
        to <a href={`mailto:${SAFETY_EMAIL}`}>{SAFETY_EMAIL}</a>.
      </p>

      <h2>7. Notifications</h2>
      <p>
        If you allow notifications, we’ll tell you when your circle’s memory is ready. You can turn them off in
        your device settings.
      </p>

      <h2>8. The service</h2>
      <p>
        Kinwhim is free to use today. We may change, add, or remove features. If we ever charge for anything,
        we’ll ask you first. We may suspend the service for maintenance or end it with reasonable notice, and
        we’ll give you a way to save your memories first.
      </p>

      <h2>9. Disclaimers</h2>
      <p>
        Kinwhim is provided “as is” and “as available.” To the extent the law allows, we disclaim all
        warranties, including fitness for a particular purpose and non-infringement, and we don’t guarantee
        that AI output will be accurate, flattering, or available every night.
      </p>

      <h2>10. Limitation of liability</h2>
      <p>
        To the extent the law allows, Kinwhim won’t be liable for indirect, incidental, special, consequential,
        or punitive damages, or for lost data or profits. Our total liability for any claim is limited to USD
        $50. Some places don’t allow these limits, so they may not apply to you.
      </p>

      <h2>11. Ending your use</h2>
      <p>
        You can stop using Kinwhim and delete your account at any time. We may suspend or end your access if
        you break these terms or create risk for others. Sections 4 (license for content not yet deleted), 9,
        10, and 12 survive.
      </p>

      <h2>12. Governing law</h2>
      <p>
        These terms are governed by the laws of {GOVERNING_LAW}, without regard to conflict-of-law rules.
        Nothing here takes away rights you have under the consumer protection laws where you live.
      </p>

      <h2>13. App stores</h2>
      <p>
        If you downloaded Kinwhim from the Apple App Store, Apple’s Standard Licensed Application End User
        License Agreement also applies, and Apple has no obligation to provide support or maintenance for
        Kinwhim. Apple and its subsidiaries are third-party beneficiaries of these terms. The same applies to
        Google if you downloaded Kinwhim from Google Play.
      </p>

      <h2>14. Changes</h2>
      <p>
        If we change these terms materially, we’ll tell you in the app and ask you to accept them before your
        next upload.
      </p>

      <h2>Contact</h2>
      <p>
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      </p>
    </LegalPage>
  );
}
