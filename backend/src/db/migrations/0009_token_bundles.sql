CREATE TABLE IF NOT EXISTS `token_bundles` (
  `id` varchar(36) NOT NULL,
  `name` varchar(255) NOT NULL,
  `token_amount` int NOT NULL,
  `price` decimal(12,2) NOT NULL DEFAULT '0.00',
  `sort_order` int NOT NULL DEFAULT 0,
  `is_active` boolean DEFAULT true,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_bundles_token_amount_unique` (`token_amount`)
);

INSERT IGNORE INTO `token_bundles` (`id`, `name`, `token_amount`, `price`, `sort_order`, `is_active`)
VALUES
  ('tok-25k', '25,000 Tokens', 25000, 50000.00, 1, true),
  ('tok-50k', '50,000 Tokens', 50000, 90000.00, 2, true),
  ('tok-100k', '100,000 Tokens', 100000, 160000.00, 3, true);
