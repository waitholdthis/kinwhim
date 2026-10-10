# Privacy disclosures

These answers describe what the code in this repository actually does. If you add analytics, crash reporting, ads, or new data fields, update this file, the iOS privacy manifest in `mobile/app.config.ts`, and `/privacy` together.

## What Kinwhim collects (source of truth)

| Data | Where it lives | Purpose | Retention |
| --- | --- | --- | --- |
| Email, display name | `profiles` | Account, showing your name to your circle | Until account deletion |
| Apple/Google subject ID, Apple refresh token | `identities` | Sign-in; Apple token revoked on deletion | Until account deletion |
| Selfies (+ mood, caption, AI consent flag) | R2 + `checkins` | Show your check-in to your circle; make the memory | 14 days, or sooner if deleted |
| AI memories | R2 + `memories`, `memory_participants` | The circle’s memory shelf | Until deleted by keeper/participant, circle ends, or a participant deletes their account |
| Reactions, read receipts | `reactions`, `notification_reads` | Reactions and the unread badge | Until account deletion |
| Check-in dates | `checkin_log` | Streaks | Until leaving the circle or account deletion |
| Reminders sent | `notification_log` | One reminder per kind per day | 30 days |
| Push token | `push_tokens` | Memory-ready notifications | Until sign-out, uninstall, or deletion |
| Reports, blocks | `reports`, `user_blocks` | Safety and moderation | Evidence: deleted on dismissal, 365 days if actioned |
| IP address | `rate_limits` keys | Abuse prevention | ≤ 7 days |

Sent to service providers: OpenAI (opted-in selfies, names, moods, captions, for image generation), Cloudflare (hosting/storage), Resend (email codes), Expo/APNs/FCM (push). No analytics, advertising, or tracking SDKs are included in the app.

## Apple App Privacy (“nutrition label”)

**Do you or your third-party partners collect data from this app?** Yes.

For every type below: **Linked to the user: Yes. Used for tracking: No. Purpose: App Functionality** (no other purposes).

| Category | Data type |
| --- | --- |
| Contact Info | Email Address |
| Contact Info | Name |
| User Content | Photos or Videos |
| User Content | Other User Content (captions, reactions, reports) |
| Identifiers | User ID |
| Identifiers | Device ID (push notification token) |

Do **not** select: Location, Contacts, Health, Financial, Browsing/Search History, Usage Data, Diagnostics, Purchases, Sensitive Info.

> Note on Sensitive Info and face data: Kinwhim doesn’t extract face geometry or create biometric identifiers; photos are passed to an image model as visual references. If that ever changes (for example, face matching), revisit this answer, the privacy policy, and biometric-privacy laws such as Illinois BIPA with counsel.

**Tracking:** No. There’s no App Tracking Transparency prompt and no tracking domains (declared in the privacy manifest).

## Google Play Data safety

**Does your app collect or share any of the required user data types?** Yes.
**Is all user data encrypted in transit?** Yes.
**Do you provide a way for users to request that their data is deleted?** Yes: in-app, and at https://kinwhim.app/delete-account.

**Shared:** none. Transfers to OpenAI, Cloudflare, Resend, and Expo are to service providers processing on Kinwhim’s behalf, which Google excludes from “sharing”.

**Collected:**

| Category → type | Collected | Optional? | Purposes |
| --- | --- | --- | --- |
| Personal info → Name | Yes | Required | App functionality, Account management |
| Personal info → Email address | Yes | Required | App functionality, Account management |
| Personal info → User IDs | Yes | Required | App functionality, Account management |
| Photos and videos → Photos | Yes | Required for check-ins | App functionality |
| App activity → Other user-generated content | Yes | Optional | App functionality |
| Device or other IDs | Yes | Optional (notifications) | App functionality |

Processed ephemerally? No: photos are stored, for 14 days.

Not collected: location, financial info, health, messages, audio, files and docs, calendar, contacts, web browsing, app info and performance, app interactions/analytics.

## Policy cross-check

| Requirement | Where it’s met |
| --- | --- |
| Privacy policy URL | `/privacy` (`app/privacy/page.tsx`) |
| Data retention and AI disclosure | `/privacy` sections “How the AI works with your photos” and “How long we keep things” |
| Explicit consent before sharing with third-party AI | `mobile/src/app/(app)/terms.tsx` (separate AI checkbox) and the per-check-in switch |
| Account deletion (in-app + web) | Settings → Delete account; `/delete-account`; `DELETE /api/account` |
| Selfie deletion | Check-in → Remove; Settings → Delete all my selfies; 14-day auto purge |
| Sign in with Apple revocation | `lib/content.ts` → `revokeAppleToken` |
| Report / block / remove | `/report` screen, member actions, `POST /api/reports`, `/api/blocks`, `/api/circles/members` |
| Terms acceptance before upload | Server enforces `terms_required` in `POST /api/checkins` |
| Moderation contact & CSAE standards | `/support`, `/safety`, `safety@kinwhim.app` |
