ALTER TABLE `users` ADD `bonus_tokens` int NOT NULL DEFAULT 0;
ALTER TABLE `payments` ADD `payment_type` varchar(50) NOT NULL DEFAULT 'package';
ALTER TABLE `payments` ADD `token_amount` int NOT NULL DEFAULT 0;
