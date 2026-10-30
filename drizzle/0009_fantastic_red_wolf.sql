ALTER TABLE `inquiries` ADD `paused_from_status` text;--> statement-breakpoint
ALTER TABLE `inquiries` ADD `lifecycle_decision_at` text;--> statement-breakpoint
ALTER TABLE `inquiries` ADD `lifecycle_decision_by` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `inquiries` ADD `review_at` text;