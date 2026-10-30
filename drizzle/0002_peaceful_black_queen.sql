CREATE TABLE `clients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_clients_name` ON `clients` (`name`);--> statement-breakpoint
CREATE TABLE `employees` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_employees_active_name` ON `employees` (`active`,`last_name`,`first_name`);--> statement-breakpoint
CREATE TABLE `inquiry_employees` (
	`inquiry_id` integer NOT NULL,
	`employee_id` integer NOT NULL,
	FOREIGN KEY (`inquiry_id`) REFERENCES `inquiries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_inquiry_employees_inquiry` ON `inquiry_employees` (`inquiry_id`);--> statement-breakpoint
CREATE INDEX `idx_inquiry_employees_employee` ON `inquiry_employees` (`employee_id`);--> statement-breakpoint
ALTER TABLE `inquiries` ADD `client_id` integer REFERENCES clients(id);