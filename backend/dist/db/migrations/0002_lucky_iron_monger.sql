CREATE TABLE `ai_config` (
	`id` varchar(36) NOT NULL,
	`provider` varchar(100) NOT NULL DEFAULT 'gemini',
	`model_name` varchar(255) NOT NULL DEFAULT 'gemini-2.0-flash',
	`api_key` text NOT NULL,
	`base_url` varchar(500),
	`is_active` boolean DEFAULT true,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `ai_config_id` PRIMARY KEY(`id`)
);
