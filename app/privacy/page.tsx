import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import {
  CURRENT_TERMS_VERSION,
  LEGAL_ADDRESS,
  LEGAL_ENTITY,
  MINIMUM_AGE,
  PRIVACY_EMAIL,
  REPORT_EVIDENCE_RETENTION_DAYS,
  SELFIE_RETENTION_DAYS,
} from "@/lib/policies";

export const metadata: Metadata = {
  title: "Privacy Policy · Kinwhim",
  description: "What Kinwhim collects, how AI is used, how long we keep things, and how to delete them.",
};

export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="Kinwhim" title="Privacy Policy" updated={CURRENT_TERMS_VERSION}>
      <p>
        Kinwhim is a private daily ritual for small groups of friends. Each person shares one selfie a day
        with their circle, and Kinwhim turns the circle’s selfies into one playful AI-made image, called a
        memory. This policy explains what we collect, why, who helps us run the service, how long we keep
        things, and how you control them. “We” means {LEGAL_ENTITY}.
      </p>

      <h2>The short version</h2>
      <ul>
        <li>Your selfies are only visible to the members of circles you join, and circles are invitation-only.</li>
        <li>If you opt in, your selfie is sent to our AI image provider to make that night’s memory.</li>
        <li>Raw selfies are deleted automatically {SELFIE_RETENTION_DAYS} days after the day they were taken.</li>
        <li>We don’t sell your data, show ads, or use third-party tracking or advertising SDKs.</li>
        <li>You can delete your selfies, any memory you appear in, or your whole account from inside the app.</li>
      </ul>

      <h2>What we collect</h2>
      <table>
        <thead>
          <tr><th>Data</th><th>Why we use it</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Email address and display name</td>
            <td>To create your account, sign you in, show your name to your circle, and contact you about your account or a safety report.</td>
          </tr>
          <tr>
            <td>Sign-in identifiers from Apple or Google</td>
            <td>To recognize your account when you use Sign in with Apple or Google. With Apple, you can choose to hide your email; we then receive a private relay address.</td>
          </tr>
          <tr>
            <td>Selfies, mood, and optional caption</td>
            <td>To show your check-in to your circle and, if you opt in, to make the circle’s memory.</td>
          </tr>
          <tr>
            <td>Memories, reactions, circle names, and settings</td>
            <td>To run the app: your memory shelf, emoji reactions, reveal time, and style.</td>
          </tr>
          <tr>
            <td>Push notification token and device platform</td>
            <td>To tell you when a memory is ready and keep your home-screen badge accurate.</td>
          </tr>
          <tr>
            <td>Reports and blocks</td>
            <td>To keep circles safe. A report includes what was reported, the reason, any notes you add, and a private copy of the reported image for our moderators.</td>
          </tr>
          <tr>
            <td>IP address</td>
            <td>Used briefly to stop abuse (for example, limiting repeated sign-in attempts). Rate-limit records are deleted within 7 days.</td>
          </tr>
        </tbody>
      </table>
      <p>
        We don’t collect your contacts, precise location, or browsing history. The app asks for the camera
        so you can take your selfie, and for photo-library access only when you save a memory to Photos.
      </p>

      <h2>How the AI works with your photos</h2>
      <p>
        Every check-in has a “transform my selfie” switch. When it’s on, and at least two friends in the
        circle have opted in that day, Kinwhim sends those selfies, display names, moods, and captions to
        OpenAI’s image API, which returns one illustrated group scene. We store that image as the circle’s
        memory and send it only to that circle.
      </p>
      <ul>
        <li>We ask for your explicit permission before the first time your selfie is shared with the AI provider, and you can switch it off on any check-in.</li>
        <li>
          OpenAI processes these images to provide the service to us. Under OpenAI’s API data policies,
          API inputs aren’t used to train OpenAI’s models, and OpenAI may keep them for up to 30 days to
          monitor for abuse.
        </li>
        <li>We don’t use facial recognition, build face templates, or create biometric identifiers. The AI uses your photo only as a visual reference for one image.</li>
        <li>AI images can be imperfect or unexpected. If a memory is hurtful or inappropriate, report it and we’ll review it.</li>
      </ul>

      <h2>Who we share data with</h2>
      <p>We share data only with service providers that help us run Kinwhim, and only as needed:</p>
      <ul>
        <li><strong>Cloudflare</strong>: hosting, database, and photo storage.</li>
        <li><strong>OpenAI</strong>: making memories from opted-in selfies, as described above.</li>
        <li><strong>Resend</strong>: delivering sign-in codes and safety emails.</li>
        <li><strong>Expo, Apple, and Google</strong>: delivering push notifications.</li>
        <li><strong>Apple and Google</strong>: confirming your identity when you sign in with them.</li>
      </ul>
      <p>
        We may also share information if the law requires it, to protect someone’s safety, or to report
        child sexual abuse material to the National Center for Missing &amp; Exploited Children (NCMEC). If
        Kinwhim is ever sold or merged, this policy will continue to apply to your data.
      </p>

      <h2>How long we keep things</h2>
      <table>
        <tbody>
          <tr><td>Raw selfies</td><td>{SELFIE_RETENTION_DAYS} days after the day they were taken, or sooner if you delete them.</td></tr>
          <tr><td>Memories</td><td>Until the circle keeper or anyone featured deletes it, the circle ends, or anyone featured deletes their account.</td></tr>
          <tr><td>Account details</td><td>Until you delete your account.</td></tr>
          <tr><td>Sign-in sessions</td><td>90 days after you last used the app.</td></tr>
          <tr><td>Email sign-in codes</td><td>10 minutes.</td></tr>
          <tr><td>Reports</td><td>Evidence is deleted when a report is dismissed. If we take action, evidence is kept for up to {REPORT_EVIDENCE_RETENTION_DAYS} days so we can handle appeals and repeat abuse.</td></tr>
          <tr><td>Backups</td><td>Deleted data can remain in encrypted backups for up to 30 days.</td></tr>
        </tbody>
      </table>

      <h2>Your choices and rights</h2>
      <ul>
        <li><strong>Delete a selfie</strong>: open today’s check-in and remove it, or use Settings → Delete all my selfies.</li>
        <li><strong>Delete a memory</strong>: the circle keeper or anyone in the memory can delete it.</li>
        <li><strong>Leave a circle</strong>: your selfies in that circle are deleted.</li>
        <li><strong>Delete your account</strong>: Settings → Delete account, or <a href="/delete-account">kinwhim.app/delete-account</a>. We delete your profile, sign-in methods, selfies, reactions, and every memory you appear in, and we revoke Sign in with Apple access.</li>
        <li><strong>Access or correct your data</strong>: email <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.</li>
      </ul>
      <p>
        Depending on where you live (for example, the EU, UK, or California), you may have rights to access,
        correct, delete, or port your data, and to object to or restrict some processing. We honor these
        requests for everyone. We rely on our contract with you to run the service, on your consent for AI
        transformation and notifications, and on our legitimate interest in keeping Kinwhim safe. You can also
        complain to your local data protection authority.
      </p>

      <h2>Children</h2>
      <p>
        Kinwhim isn’t for children under {MINIMUM_AGE}, and we don’t knowingly collect their data. If you
        believe a child under {MINIMUM_AGE} is using Kinwhim, tell us at{" "}
        <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a> and we’ll delete the account. Read our{" "}
        <a href="/safety">child safety standards</a>.
      </p>

      <h2>Security</h2>
      <p>
        Data is encrypted in transit. Photos are stored privately and served only to signed-in members of the
        right circle. Sign-in tokens are stored hashed. No system is perfectly secure, so please tell us at{" "}
        <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a> if you find a problem.
      </p>

      <h2>International transfers</h2>
      <p>
        Our providers may process data in the United States and other countries. Where required, we rely on
        appropriate safeguards such as standard contractual clauses.
      </p>

      <h2>Changes</h2>
      <p>
        If we change this policy materially, we’ll tell you in the app and ask you to review it before your
        next upload.
      </p>

      <h2>Contact</h2>
      <p>
        {LEGAL_ENTITY} · {LEGAL_ADDRESS} · <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>
      </p>
    </LegalPage>
  );
}
