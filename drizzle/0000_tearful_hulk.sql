CREATE TABLE `inquiries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reference_no` integer NOT NULL,
	`year` integer NOT NULL,
	`client` text NOT NULL,
	`internal_no` text DEFAULT '' NOT NULL,
	`received_at` text NOT NULL,
	`offer_sent_at` text,
	`confirmed_at` text,
	`description` text NOT NULL,
	`status` text NOT NULL,
	`recipient` text DEFAULT '' NOT NULL,
	`analyst` text DEFAULT '' NOT NULL,
	`evaluation_due_at` text,
	`project_manager` text DEFAULT '' NOT NULL,
	`status_comment` text DEFAULT '' NOT NULL,
	`implemented_at` text,
	`folder_path` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_inquiries_status` ON `inquiries` (`status`);--> statement-breakpoint
CREATE INDEX `idx_inquiries_client` ON `inquiries` (`client`);--> statement-breakpoint
CREATE INDEX `idx_inquiries_year_status` ON `inquiries` (`year`,`status`);