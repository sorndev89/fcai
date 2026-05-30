CREATE TABLE `chat_logs` (
	`id` varchar(36) NOT NULL,
	`page_id` varchar(36) NOT NULL,
	`customer_id` varchar(36) NOT NULL,
	`message_in` text NOT NULL,
	`message_out` text NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `chat_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` varchar(36) NOT NULL,
	`page_id` varchar(36) NOT NULL,
	`fb_psid` varchar(255) NOT NULL,
	`full_name` varchar(255),
	`first_name` varchar(255),
	`last_name` varchar(255),
	`profile_pic` text,
	`phone_number` varchar(50),
	`email` varchar(255),
	`address` text,
	`notes` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`),
	CONSTRAINT `customers_fb_psid_unique` UNIQUE(`fb_psid`)
);
--> statement-breakpoint
CREATE TABLE `pages` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`fb_page_id` varchar(255) NOT NULL,
	`fb_page_name` varchar(255) NOT NULL,
	`fb_page_access_token` text NOT NULL,
	`knowledge_base` text NOT NULL,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `pages_id` PRIMARY KEY(`id`),
	CONSTRAINT `pages_fb_page_id_unique` UNIQUE(`fb_page_id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
