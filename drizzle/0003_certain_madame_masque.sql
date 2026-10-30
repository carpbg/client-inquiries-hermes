ALTER TABLE `inquiries` ADD `recipient_employee_id` integer REFERENCES employees(id);--> statement-breakpoint
ALTER TABLE `inquiries` ADD `analyst_employee_id` integer REFERENCES employees(id);--> statement-breakpoint
ALTER TABLE `inquiries` ADD `project_manager_employee_id` integer REFERENCES employees(id);