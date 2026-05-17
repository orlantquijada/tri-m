CREATE TABLE `account` (
	`access_token` text,
	`access_token_expires_at` integer,
	`account_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`id` text PRIMARY KEY,
	`id_token` text,
	`password` text,
	`provider_id` text NOT NULL,
	`refresh_token` text,
	`refresh_token_expires_at` integer,
	`scope` text,
	`updated_at` integer NOT NULL,
	`user_id` text NOT NULL,
	CONSTRAINT `fk_account_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `session` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`expires_at` integer NOT NULL,
	`id` text PRIMARY KEY,
	`ip_address` text,
	`token` text NOT NULL UNIQUE,
	`updated_at` integer NOT NULL,
	`user_agent` text,
	`user_id` text NOT NULL,
	CONSTRAINT `fk_session_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `user` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`distributor_id` integer,
	`email` text NOT NULL UNIQUE,
	`email_verified` integer DEFAULT false NOT NULL,
	`id` text PRIMARY KEY,
	`image` text,
	`name` text NOT NULL,
	`role` text DEFAULT 'admin' NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`expires_at` integer NOT NULL,
	`id` text PRIMARY KEY,
	`identifier` text NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`address` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,
	`updated_at` integer NOT NULL,
	`distributor_id` integer NOT NULL,
	`full_name` text NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`latitude` real,
	`longitude` real,
	`notes` text,
	`phone` text NOT NULL,
	`risk_status` text DEFAULT 'good' NOT NULL,
	CONSTRAINT `fk_customers_distributor_id_distributors_id_fk` FOREIGN KEY (`distributor_id`) REFERENCES `distributors`(`id`)
);
--> statement-breakpoint
CREATE TABLE `distributors` (
	`assigned_area` text,
	`created_at` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,
	`updated_at` integer NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`amount_cents` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,
	`updated_at` integer NOT NULL,
	`customer_id` integer NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`notes` text,
	`payment_date` text NOT NULL,
	`payment_method` text NOT NULL,
	`receivable_id` integer NOT NULL,
	`recorded_by` text,
	`reference_number` text,
	CONSTRAINT `fk_payments_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`),
	CONSTRAINT `fk_payments_receivable_id_receivables_id_fk` FOREIGN KEY (`receivable_id`) REFERENCES `receivables`(`id`)
);
--> statement-breakpoint
CREATE TABLE `receivables` (
	`created_at` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,
	`updated_at` integer NOT NULL,
	`current_balance_cents` integer NOT NULL,
	`customer_id` integer NOT NULL,
	`distributor_id` integer NOT NULL,
	`down_payment_cents` integer DEFAULT 0 NOT NULL,
	`first_due_date` text NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`monthly_due_amount_cents` integer,
	`original_balance_cents` integer NOT NULL,
	`payment_term_months` integer,
	`product_description` text NOT NULL,
	`sale_date` text NOT NULL,
	`status` text DEFAULT 'current' NOT NULL,
	`total_amount_cents` integer NOT NULL,
	CONSTRAINT `fk_receivables_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`),
	CONSTRAINT `fk_receivables_distributor_id_distributors_id_fk` FOREIGN KEY (`distributor_id`) REFERENCES `distributors`(`id`)
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);