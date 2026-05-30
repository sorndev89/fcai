CREATE TABLE `packages` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`max_pages` int NOT NULL DEFAULT 1,
	`max_tokens` int NOT NULL DEFAULT 10000,
	`price` decimal(12,2) NOT NULL DEFAULT '0.00',
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `packages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`package_id` varchar(36) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'pending',
	`recorded_by` varchar(36),
	`payment_date` timestamp,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `chat_logs` ADD `token_count` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `users` ADD `role` varchar(50) DEFAULT 'tenant' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `status` varchar(50) DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `package_id` varchar(36);