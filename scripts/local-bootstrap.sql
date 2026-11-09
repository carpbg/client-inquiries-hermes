-- Local-only bootstrap for an EMPTY D1 database.
-- Do not run against production or a database that already has application tables.
PRAGMA foreign_keys = ON;

-- 0000_tearful_hulk.sql
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

CREATE INDEX `idx_inquiries_status` ON `inquiries` (`status`);
CREATE INDEX `idx_inquiries_client` ON `inquiries` (`client`);
CREATE INDEX `idx_inquiries_year_status` ON `inquiries` (`year`,`status`);

-- 0001_overrated_sandman.sql
CREATE TABLE `documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`inquiry_id` integer NOT NULL,
	`category` text NOT NULL,
	`file_name` text NOT NULL,
	`object_key` text NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`uploaded_by` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`inquiry_id`) REFERENCES `inquiries`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX `idx_documents_inquiry_category` ON `documents` (`inquiry_id`,`category`);
CREATE TABLE `notification_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`inquiry_id` integer NOT NULL,
	`event` text NOT NULL,
	`recipients` text NOT NULL,
	`subject` text NOT NULL,
	`delivery_status` text NOT NULL,
	`error_message` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`inquiry_id`) REFERENCES `inquiries`(`id`) ON UPDATE no action ON DELETE cascade
);

ALTER TABLE `inquiries` ADD `stakeholder_emails` text DEFAULT '' NOT NULL;

-- 0002_peaceful_black_queen.sql
CREATE TABLE `clients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX `idx_clients_name` ON `clients` (`name`);
CREATE TABLE `employees` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX `idx_employees_active_name` ON `employees` (`active`,`last_name`,`first_name`);
CREATE TABLE `inquiry_employees` (
	`inquiry_id` integer NOT NULL,
	`employee_id` integer NOT NULL,
	FOREIGN KEY (`inquiry_id`) REFERENCES `inquiries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE INDEX `idx_inquiry_employees_inquiry` ON `inquiry_employees` (`inquiry_id`);
CREATE INDEX `idx_inquiry_employees_employee` ON `inquiry_employees` (`employee_id`);
ALTER TABLE `inquiries` ADD `client_id` integer REFERENCES clients(id);

-- 0003_certain_madame_masque.sql
ALTER TABLE `inquiries` ADD `recipient_employee_id` integer REFERENCES employees(id);
ALTER TABLE `inquiries` ADD `analyst_employee_id` integer REFERENCES employees(id);
ALTER TABLE `inquiries` ADD `project_manager_employee_id` integer REFERENCES employees(id);

-- 0004_ordinary_mockingbird.sql
CREATE TABLE `email_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`provider` text DEFAULT 'resend' NOT NULL,
	`api_key` text DEFAULT '' NOT NULL,
	`from_name` text DEFAULT 'HeRMeS Notifications' NOT NULL,
	`from_email` text DEFAULT '' NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);


-- 0005_sour_iron_man.sql
CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

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

CREATE UNIQUE INDEX `notification_templates_event_key_unique` ON `notification_templates` (`event_key`);
ALTER TABLE `employees` ADD `system_role` text DEFAULT '' NOT NULL;

-- 0006_foamy_selene.sql
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

CREATE INDEX `idx_action_log_inquiry_created` ON `action_log` (`inquiry_id`,`created_at`);
ALTER TABLE `inquiries` ADD `request_type` text DEFAULT 'configuration_change' NOT NULL;
ALTER TABLE `inquiries` ADD `offer_channel` text DEFAULT '' NOT NULL;
ALTER TABLE `inquiries` ADD `offer_sent_by` text DEFAULT '' NOT NULL;
ALTER TABLE `inquiries` ADD `client_decision` text DEFAULT '' NOT NULL;
ALTER TABLE `inquiries` ADD `invoice_no` text DEFAULT '' NOT NULL;
ALTER TABLE `inquiries` ADD `invoice_date` text;
ALTER TABLE `inquiries` ADD `invoice_sent_at` text;

-- 0007_black_morlocks.sql
ALTER TABLE `documents` ADD `note` text DEFAULT '' NOT NULL;

-- 0008_awesome_malice.sql
ALTER TABLE `inquiries` ADD `is_test` integer DEFAULT false NOT NULL;

-- 0009_fantastic_red_wolf.sql
ALTER TABLE `inquiries` ADD `paused_from_status` text;
ALTER TABLE `inquiries` ADD `lifecycle_decision_at` text;
ALTER TABLE `inquiries` ADD `lifecycle_decision_by` text DEFAULT '' NOT NULL;
ALTER TABLE `inquiries` ADD `review_at` text;

-- 0010_dizzy_lady_deathstrike.sql
ALTER TABLE `inquiries` DROP COLUMN `is_test`;

-- 0011_cheerful_fallen_one.sql
ALTER TABLE `employees` ADD `access_role` text DEFAULT 'user' NOT NULL;

-- 0012_slow_black_bird.sql
ALTER TABLE `employees` ADD `notifications_enabled` integer DEFAULT true NOT NULL;

-- Local test administrator. The current test login uses the email as both username and password.
INSERT INTO employees (first_name, last_name, email, active, system_role, access_role, notifications_enabled)
VALUES ('Мартин', 'Дойчинов', 'mdoychinov@technologica.com', 1, 'department_head', 'admin', 1);
