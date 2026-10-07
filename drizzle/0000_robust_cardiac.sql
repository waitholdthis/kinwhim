CREATE TABLE `checkins` (
	`id` text PRIMARY KEY NOT NULL,
	`circle_id` text NOT NULL,
	`user_id` text NOT NULL,
	`day` text NOT NULL,
	`photo_key` text NOT NULL,
	`mood` text,
	`caption` text,
	`consent_transform` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `checkins_circle_user_day_unique` ON `checkins` (`circle_id`,`user_id`,`day`);--> statement-breakpoint
CREATE TABLE `circle_members` (
	`id` text PRIMARY KEY NOT NULL,
	`circle_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`joined_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `circle_members_circle_user_unique` ON `circle_members` (`circle_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `circles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`invite_code` text NOT NULL,
	`owner_id` text NOT NULL,
	`reveal_hour` integer DEFAULT 21 NOT NULL,
	`timezone` text DEFAULT 'America/New_York' NOT NULL,
	`style` text DEFAULT 'whimsical' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `circles_invite_code_unique` ON `circles` (`invite_code`);--> statement-breakpoint
CREATE TABLE `memories` (
	`id` text PRIMARY KEY NOT NULL,
	`circle_id` text NOT NULL,
	`day` text NOT NULL,
	`media_key` text NOT NULL,
	`kind` text DEFAULT 'collage' NOT NULL,
	`title` text NOT NULL,
	`prompt` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `memories_circle_day_unique` ON `memories` (`circle_id`,`day`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`avatar_key` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reactions` (
	`id` text PRIMARY KEY NOT NULL,
	`memory_id` text NOT NULL,
	`user_id` text NOT NULL,
	`emoji` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reactions_memory_user_unique` ON `reactions` (`memory_id`,`user_id`);