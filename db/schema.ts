import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  avatarKey: text("avatar_key"),
  termsVersion: text("terms_version"),
  termsAcceptedAt: integer("terms_accepted_at"),
  suspendedAt: integer("suspended_at"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const circles = sqliteTable(
  "circles",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    inviteCode: text("invite_code").notNull(),
    inviteRotatedAt: integer("invite_rotated_at"),
    ownerId: text("owner_id").notNull(),
    revealHour: integer("reveal_hour").notNull().default(21),
    timezone: text("timezone").notNull().default("America/New_York"),
    style: text("style").notNull().default("whimsical"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [uniqueIndex("circles_invite_code_unique").on(table.inviteCode)],
);

export const circleMembers = sqliteTable(
  "circle_members",
  {
    id: text("id").primaryKey(),
    circleId: text("circle_id").notNull(),
    userId: text("user_id").notNull(),
    role: text("role").notNull().default("member"),
    joinedAt: integer("joined_at").notNull(),
  },
  (table) => [
    uniqueIndex("circle_members_circle_user_unique").on(
      table.circleId,
      table.userId,
    ),
  ],
);

export const checkins = sqliteTable(
  "checkins",
  {
    id: text("id").primaryKey(),
    circleId: text("circle_id").notNull(),
    userId: text("user_id").notNull(),
    day: text("day").notNull(),
    photoKey: text("photo_key").notNull(),
    mood: text("mood"),
    caption: text("caption"),
    consentTransform: integer("consent_transform", { mode: "boolean" })
      .notNull()
      .default(true),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("checkins_circle_user_day_unique").on(
      table.circleId,
      table.userId,
      table.day,
    ),
  ],
);

export const memories = sqliteTable(
  "memories",
  {
    id: text("id").primaryKey(),
    circleId: text("circle_id").notNull(),
    day: text("day").notNull(),
    mediaKey: text("media_key").notNull(),
    kind: text("kind").notNull().default("collage"),
    title: text("title").notNull(),
    prompt: text("prompt").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [uniqueIndex("memories_circle_day_unique").on(table.circleId, table.day)],
);

export const reactions = sqliteTable(
  "reactions",
  {
    id: text("id").primaryKey(),
    memoryId: text("memory_id").notNull(),
    userId: text("user_id").notNull(),
    emoji: text("emoji").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("reactions_memory_user_unique").on(table.memoryId, table.userId),
  ],
);

export const generationJobs = sqliteTable(
  "generation_jobs",
  {
    id: text("id").primaryKey(),
    circleId: text("circle_id").notNull(),
    day: text("day").notNull(),
    status: text("status").notNull().default("working"),
    requestedBy: text("requested_by").notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("generation_jobs_circle_day_unique").on(
      table.circleId,
      table.day,
    ),
  ],
);

export const notificationReads = sqliteTable(
  "notification_reads",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    memoryId: text("memory_id").notNull(),
    readAt: integer("read_at").notNull(),
  },
  (table) => [
    uniqueIndex("notification_reads_user_memory_unique").on(
      table.userId,
      table.memoryId,
    ),
  ],
);

export const identities = sqliteTable(
  "identities",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    provider: text("provider").notNull(),
    subject: text("subject").notNull(),
    email: text("email"),
    refreshToken: text("refresh_token"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("identities_provider_subject_unique").on(table.provider, table.subject),
    index("identities_user_idx").on(table.userId),
  ],
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    tokenHash: text("token_hash").notNull(),
    platform: text("platform").notNull().default("web"),
    createdAt: integer("created_at").notNull(),
    lastSeenAt: integer("last_seen_at").notNull(),
    expiresAt: integer("expires_at").notNull(),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_unique").on(table.tokenHash),
    index("sessions_user_idx").on(table.userId),
  ],
);

export const emailCodes = sqliteTable(
  "email_codes",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: integer("expires_at").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("email_codes_email_idx").on(table.email)],
);

export const pushTokens = sqliteTable(
  "push_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    token: text("token").notNull(),
    platform: text("platform").notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("push_tokens_token_unique").on(table.token),
    index("push_tokens_user_idx").on(table.userId),
  ],
);

export const memoryParticipants = sqliteTable(
  "memory_participants",
  {
    id: text("id").primaryKey(),
    memoryId: text("memory_id").notNull(),
    userId: text("user_id").notNull(),
  },
  (table) => [
    uniqueIndex("memory_participants_memory_user_unique").on(table.memoryId, table.userId),
    index("memory_participants_user_idx").on(table.userId),
  ],
);

export const userBlocks = sqliteTable(
  "user_blocks",
  {
    id: text("id").primaryKey(),
    blockerId: text("blocker_id").notNull(),
    blockedId: text("blocked_id").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("user_blocks_pair_unique").on(table.blockerId, table.blockedId),
    index("user_blocks_blocked_idx").on(table.blockedId),
  ],
);

export const reports = sqliteTable(
  "reports",
  {
    id: text("id").primaryKey(),
    reporterId: text("reporter_id").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    targetUserId: text("target_user_id"),
    circleId: text("circle_id"),
    reason: text("reason").notNull(),
    details: text("details"),
    // Copy of the reported image kept for moderators until the report is resolved.
    evidenceKey: text("evidence_key"),
    status: text("status").notNull().default("open"),
    resolution: text("resolution"),
    createdAt: integer("created_at").notNull(),
    resolvedAt: integer("resolved_at"),
  },
  (table) => [
    index("reports_status_idx").on(table.status, table.createdAt),
    index("reports_reporter_idx").on(table.reporterId),
  ],
);

export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowStart: integer("window_start").notNull(),
});
