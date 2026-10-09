// Values the app, API, and published policies must agree on. Bump
// CURRENT_TERMS_VERSION whenever /terms changes materially; people are asked
// to accept again before their next upload.
export const CURRENT_TERMS_VERSION = "2026-10-09";

// Raw check-in selfies are deleted this many days after the day they were taken.
// Finished memories stay until a circle member deletes them, the circle ends,
// or someone featured in them deletes their account.
export const SELFIE_RETENTION_DAYS = 14;

export const SUPPORT_EMAIL = "support@kinwhim.app";
export const SAFETY_EMAIL = "safety@kinwhim.app";
export const PRIVACY_EMAIL = "privacy@kinwhim.app";

export const MINIMUM_AGE = 13;

// Reports that led to action keep their evidence copy this long, then it is purged.
export const REPORT_EVIDENCE_RETENTION_DAYS = 365;

// TODO(before launch): replace with the operating company's legal details.
export const LEGAL_ENTITY = "Kinwhim";
export const LEGAL_ADDRESS = "[Registered business address]";
export const GOVERNING_LAW = "[State/Country]";

export const REPORT_REASONS = [
  "nudity_or_sexual",
  "harassment_or_bullying",
  "hate_or_violence",
  "self_harm",
  "minor_safety",
  "impersonation",
  "not_consented",
  "spam",
  "other",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
