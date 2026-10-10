CREATE TABLE `checkin_log` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`circle_id` text NOT NULL,
	`day` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `checkin_log_unique` ON `checkin_log` (`user_id`,`circle_id`,`day`);--> statement-breakpoint
CREATE TABLE `notification_log` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`circle_id` text NOT NULL,
	`day` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notification_log_unique` ON `notification_log` (`user_id`,`kind`,`circle_id`,`day`);--> statement-breakpoint
ALTER TABLE `profiles` ADD `reminders_enabled` integer DEFAULT true NOT NULL;--> statement-breakpoint
-- Seed streak history from check-ins still on file and from everyone who appears in past memories.
INSERT OR IGNORE INTO `checkin_log` (`id`, `user_id`, `circle_id`, `day`)
SELECT lower(hex(randomblob(16))), `user_id`, `circle_id`, `day` FROM `checkins`;
--> statement-breakpoint
INSERT OR IGNORE INTO `checkin_log` (`id`, `user_id`, `circle_id`, `day`)
SELECT lower(hex(randomblob(16))), mp.`user_id`, m.`circle_id`, m.`day`
FROM `memory_participants` mp INNER JOIN `memories` m ON m.`id` = mp.`memory_id`;
