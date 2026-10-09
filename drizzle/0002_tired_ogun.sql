CREATE TABLE `notification_reads` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`memory_id` text NOT NULL,
	`read_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notification_reads_user_memory_unique` ON `notification_reads` (`user_id`,`memory_id`);