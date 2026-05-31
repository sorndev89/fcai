CREATE TABLE `bank_accounts` (
	`id` varchar(36) NOT NULL,
	`bank_name` varchar(255) NOT NULL,
	`account_name` varchar(255) NOT NULL,
	`account_number` varchar(255) NOT NULL,
	`qr_code_url` text,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `bank_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `payments` ADD `slip_url` text;