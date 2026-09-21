CREATE TABLE `user_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`display_name` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`role` text DEFAULT 'author' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
INSERT OR IGNORE INTO `user_profiles` (`user_id`, `display_name`, `email`, `role`, `created_at`, `updated_at`) VALUES ('a9cc9ae0-bb82-43f0-a772-d26b8f8a9921', '', '', 'admin', datetime('now'), datetime('now'));
--> statement-breakpoint
CREATE INDEX `idx_user_profiles_role` ON `user_profiles` (`role`);
