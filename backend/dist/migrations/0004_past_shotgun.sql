ALTER TABLE `customers` DROP INDEX `customers_fb_psid_unique`;--> statement-breakpoint
ALTER TABLE `customers` ADD CONSTRAINT `page_psid_unique` UNIQUE(`page_id`,`fb_psid`);