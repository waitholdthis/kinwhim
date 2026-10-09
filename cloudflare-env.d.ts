declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    OPENAI_API_KEY?: string;
    // Public origin used in invite links and emails, e.g. https://kinwhim.app
    PUBLIC_APP_URL?: string;
    // Sign in with Apple: bundle ID (and optional web Services ID), comma separated.
    APPLE_CLIENT_IDS?: string;
    // Needed to exchange authorization codes and revoke tokens on account deletion.
    APPLE_TEAM_ID?: string;
    APPLE_KEY_ID?: string;
    APPLE_PRIVATE_KEY?: string;
    // Google OAuth client IDs (iOS, Android, web), comma separated.
    GOOGLE_CLIENT_IDS?: string;
    // Email sign-in codes are sent through Resend.
    RESEND_API_KEY?: string;
    EMAIL_FROM?: string;
    // Where new safety reports are emailed.
    MODERATION_EMAIL?: string;
    // Bearer secret for /api/admin/* moderation tools.
    ADMIN_TOKEN?: string;
    // Bearer secret for /api/cron/nightly.
    CRON_SECRET?: string;
    // Optional App Review demo login: a fixed email address and code.
    REVIEW_EMAIL?: string;
    REVIEW_CODE?: string;
    // Universal links / Android App Links.
    APPLE_APP_IDS?: string; // e.g. ABCDE12345.app.kinwhim
    ANDROID_PACKAGE?: string;
    ANDROID_CERT_SHA256?: string; // comma separated SHA-256 fingerprints
    APP_STORE_URL?: string;
    PLAY_STORE_URL?: string;
    // Expo push access token (optional; only needed with enhanced push security).
    EXPO_ACCESS_TOKEN?: string;
  }
}
