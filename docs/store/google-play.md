# Google Play listing

## Main store listing

| Field | Value |
| --- | --- |
| App name [≤30] | Kinwhim: Friend Circles |
| Short description [≤80] | One selfie a day with your closest friends, one shared illustrated world. |
| Category | Social |
| Tags | Social, Photography |
| Contact email | support@kinwhim.app |
| Website | https://kinwhim.app |
| Privacy policy | https://kinwhim.app/privacy |
| App icon | `artwork/play-icon-512.png` |
| Feature graphic | `artwork/play-feature-graphic.png` |

**Full description [≤4000]:** reuse the App Store description in [app-store.md](app-store.md#description-4000) unchanged; it contains no iOS-specific claims.

## App content

### Privacy policy
`https://kinwhim.app/privacy`

### Ads
No, the app doesn’t contain ads.

### App access
All functionality is behind sign-in. Add instructions:

> Tap “Continue with email”, enter `REVIEW_EMAIL`, then the code `REVIEW_CODE`. No email is sent for this address. The account belongs to a circle with sample memories.

### Content rating (IARC questionnaire)
- Category: **Social / communication**
- Violence, sexual content, language, controlled substances, gambling: **No**
- Can users interact or exchange content? **Yes.** Users share photos and short captions inside private, invite-only groups.
- Does the app share the user’s current location? **No**
- Digital purchases? **No**
- Is it a web browser or search engine? **No**

Expected result: Teen / PEGI 12. Fine, as it matches the 13+ Terms.

### Target audience and content
- Age groups: **13–15, 16–17, 18+** (don’t select under 13; that would put the app under the Families policy).
- Appeals to children? **No.**

### Data safety
See [privacy-disclosures.md](privacy-disclosures.md#google-play-data-safety).

### Account deletion
- Can users create an account? **Yes**
- Delete account URL: `https://kinwhim.app/delete-account`
- In-app path: Settings → Delete account

### Child Safety Standards (required for Social apps)
- Standards URL: `https://kinwhim.app/safety`
- Child safety point of contact: `safety@kinwhim.app`
- Confirm: in-app reporting exists, and CSAM is removed and reported to NCMEC.

### Government apps, financial features, health
Not applicable.

### Photo and video permissions
The app declares **no** `READ_MEDIA_IMAGES`/`READ_MEDIA_VIDEO` permissions (blocked in `app.config.ts`). Selfies come from the camera or the system Photo Picker, and saving uses MediaStore. If Play Console asks, answer that the app does not access the photo library.

### AI-generated content
Kinwhim generates images with AI. Play’s AI-Generated Content policy requires in-app reporting of offensive AI output; that’s the **Report memory** action on every memory.

## Release
1. Internal testing → closed testing (new personal accounts: 12+ testers for 14 consecutive days) → production.
2. Opt in to Play App Signing, then copy the **app signing key SHA-256** into the server secret `ANDROID_CERT_SHA256` so App Links verify.
