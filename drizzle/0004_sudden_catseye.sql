CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#6b7280' NOT NULL,
	`parent_id` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_products_parent` ON `products` (`parent_id`);--> statement-breakpoint
ALTER TABLE `user_stories` ADD `type` text DEFAULT 'user_story' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_stories` ADD `product_id` text REFERENCES products(id);--> statement-breakpoint
CREATE INDEX `idx_stories_product` ON `user_stories` (`product_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_stories_type` ON `user_stories` (`type`,`status`);--> statement-breakpoint
INSERT INTO `products` (`id`, `name`, `color`, `sort_order`, `created_at`, `updated_at`)
VALUES ('default-product', 'General', '#6b7280', 0, datetime('now'), datetime('now'));--> statement-breakpoint
UPDATE `user_stories` SET `product_id` = 'default-product' WHERE `product_id` IS NULL;