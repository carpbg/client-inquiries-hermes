CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notification_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_key` text NOT NULL,
	`step_no` integer NOT NULL,
	`name` text NOT NULL,
	`recipient_roles` text NOT NULL,
	`subject_template` text NOT NULL,
	`body_template` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notification_templates_event_key_unique` ON `notification_templates` (`event_key`);--> statement-breakpoint
ALTER TABLE `employees` ADD `system_role` text DEFAULT '' NOT NULL;