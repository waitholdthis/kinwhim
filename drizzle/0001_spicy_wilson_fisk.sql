CREATE TABLE `generation_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`circle_id` text NOT NULL,
	`day` text NOT NULL,
	`status` text DEFAULT 'working' NOT NULL,
	`requested_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `generation_jobs_circle_day_unique` ON `generation_jobs` (`circle_id`,`day`);