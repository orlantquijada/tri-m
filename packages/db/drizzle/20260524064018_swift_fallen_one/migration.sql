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
	`distributor_id` text,
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
CREATE TABLE `audit_events` (
	`actor_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,
	`distributor_id` text,
	`entity_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`event` text NOT NULL,
	`id` text PRIMARY KEY,
	`metadata` text
);
--> statement-breakpoint
CREATE TABLE `blacklist_requests` (
	`created_at` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,
	`customer_id` text NOT NULL,
	`distributor_id` text NOT NULL,
	`id` text PRIMARY KEY,
	`reason` text NOT NULL,
	`requested_by_user_id` text NOT NULL,
	`review_note` text,
	`reviewed_at` integer,
	`reviewed_by_user_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	CONSTRAINT `fk_blacklist_requests_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`),
	CONSTRAINT `fk_blacklist_requests_distributor_id_distributors_id_fk` FOREIGN KEY (`distributor_id`) REFERENCES `distributors`(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`address` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,
	`updated_at` integer NOT NULL,
	`distributor_id` text NOT NULL,
	`full_name` text NOT NULL,
	`id` text PRIMARY KEY,
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
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payment_schedules` (
	`created_at` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,
	`updated_at` integer NOT NULL,
	`due_amount_cents` integer NOT NULL,
	`due_date` text NOT NULL,
	`id` text PRIMARY KEY,
	`installment_no` integer NOT NULL,
	`paid_amount_cents` integer DEFAULT 0 NOT NULL,
	`receivable_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	CONSTRAINT `fk_payment_schedules_receivable_id_receivables_id_fk` FOREIGN KEY (`receivable_id`) REFERENCES `receivables`(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`amount_cents` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,
	`updated_at` integer NOT NULL,
	`customer_id` text NOT NULL,
	`id` text PRIMARY KEY,
	`notes` text,
	`payment_date` text NOT NULL,
	`payment_method` text NOT NULL,
	`receivable_id` text NOT NULL,
	`recorded_by` text,
	`reference_number` text,
	`void_reason` text,
	`voided_at` text,
	CONSTRAINT `fk_payments_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`),
	CONSTRAINT `fk_payments_receivable_id_receivables_id_fk` FOREIGN KEY (`receivable_id`) REFERENCES `receivables`(`id`)
);
--> statement-breakpoint
CREATE TABLE `receivables` (
	`created_at` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,
	`updated_at` integer NOT NULL,
	`current_balance_cents` integer NOT NULL,
	`customer_id` text NOT NULL,
	`distributor_id` text NOT NULL,
	`down_payment_cents` integer DEFAULT 0 NOT NULL,
	`first_due_date` text NOT NULL,
	`id` text PRIMARY KEY,
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
CREATE TABLE `visits` (
	`created_at` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,
	`customer_id` text NOT NULL,
	`distributor_id` text NOT NULL,
	`gps_lat` real,
	`gps_lng` real,
	`id` text PRIMARY KEY,
	`notes` text,
	`outcome` text NOT NULL,
	`promise_resolved_at` integer,
	`promised_amount_cents` integer,
	`promised_date` text,
	`recorded_by_user_id` text NOT NULL,
	`type` text NOT NULL,
	CONSTRAINT `fk_visits_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`),
	CONSTRAINT `fk_visits_distributor_id_distributors_id_fk` FOREIGN KEY (`distributor_id`) REFERENCES `distributors`(`id`)
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE INDEX `audit_events_created_at_idx` ON `audit_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `audit_events_entity_idx` ON `audit_events` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `payment_schedules_receivable_id_idx` ON `payment_schedules` (`receivable_id`);--> statement-breakpoint
CREATE INDEX `visits_customer_created_at_idx` ON `visits` (`customer_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `visits_open_promise_idx` ON `visits` (`distributor_id`,`promise_resolved_at`,`promised_date`);