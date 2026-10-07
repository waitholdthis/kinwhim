import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  avatarKey: text("avatar_key"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const circles = sqliteTable(
  "circles",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    inviteCode: text("invite_code").notNull(),
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
