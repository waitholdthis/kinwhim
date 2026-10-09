# Kinwhim mobile

The iPhone-first Kinwhim app (Android from the same code), built with Expo SDK 57 and Expo Router. It talks to the same API as the web app in the repo root.

## What's in here

| Path | Purpose |
| --- | --- |
| `src/app/sign-in.tsx`, `email.tsx` | Sign in with Apple, Google, or an emailed code |
| `src/app/join/[code].tsx` | Handles `https://kinwhim.app/join/<code>` and `kinwhim://join/<code>` invites |
| `src/app/(app)/(tabs)/` | Today, Memories, Circle |
| `src/app/(app)/checkin.tsx` | Front-camera selfie capture, mood, caption, AI consent switch |
| `src/app/(app)/memory/[id].tsx` | Memory detail: Save to Photos, share sheet, reactions, report, delete |
| `src/app/(app)/terms.tsx` | Terms and explicit AI-sharing consent before the first upload |
| `src/app/(app)/report.tsx` | Report a photo, memory, or person (optionally block) |
| `src/app/(app)/settings.tsx` | Name, notifications, blocked people, delete selfies, delete account |
| `src/lib/session.tsx` | Session token in the Keychain/Keystore via `expo-secure-store` |
| `src/lib/push.ts` | Expo push registration and home-screen badge |
| `scripts/make-icons.mjs` | Regenerates icons from the brand mark (`npm run icons`) |

## Configure

Public build settings come from environment variables (set them in `eas.json` → `env`, or `.env.local` for local runs):

| Variable | Example |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | `https://kinwhim.app` |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google OAuth **Web** client ID (the ID token's audience) |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Google OAuth **iOS** client ID |
| `GOOGLE_IOS_URL_SCHEME` | Reversed iOS client ID, `com.googleusercontent.apps.…` |
| `EAS_PROJECT_ID` | From `npx eas-cli@latest init`; needed for push tokens |

The server must list the same IDs: `APPLE_CLIENT_IDS=app.kinwhim` and `GOOGLE_CLIENT_IDS=<web client id>,<ios client id>,<android client id>`.

## Run

Apple and Google sign-in, the camera, and push use native code, so use a development build instead of Expo Go:

```sh
npm install
npx eas-cli@latest build --profile development --platform ios   # or: npx expo run:ios on a Mac
npx expo start --dev-client
```

Checks: `npm run typecheck`, `npx eslint src`, `npx expo-doctor`.

## Ship

```sh
npx eas-cli@latest build --profile production --platform ios
npx eas-cli@latest submit --profile production --platform ios
```

Android uses the same commands with `--platform android`. Store copy, privacy answers, and the review checklist live in [`../docs/store`](../docs/store).
