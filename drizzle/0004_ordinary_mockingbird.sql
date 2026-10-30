CREATE TABLE `email_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`provider` text DEFAULT 'resend' NOT NULL,
	`api_key` text DEFAULT '' NOT NULL,
	`from_name` text DEFAULT 'HeRMeS Notifications' NOT NULL,
	`from_email` text DEFAULT '' NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
