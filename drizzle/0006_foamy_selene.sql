CREATE TABLE `action_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`inquiry_id` integer NOT NULL,
	`action` text NOT NULL,
	`details` text DEFAULT '' NOT NULL,
	`actor_id` text DEFAULT '' NOT NULL,
	`actor_email` text DEFAULT '' NOT NULL,
	`actor_name` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`inquiry_id`) REFERENCES `inquiries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_action_log_inquiry_created` ON `action_log` (`inquiry_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `inquiries` ADD `request_type` text DEFAULT 'configuration_change' NOT NULL;--> statement-breakpoint
ALTER TABLE `inquiries` ADD `offer_channel` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `inquiries` ADD `offer_sent_by` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `inquiries` ADD `client_decision` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `inquiries` ADD `invoice_no` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `inquiries` ADD `invoice_date` text;--> statement-breakpoint
ALTER TABLE `inquiries` ADD `invoice_sent_at` text;