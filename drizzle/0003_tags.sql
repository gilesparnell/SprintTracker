CREATE TABLE `tags` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `color` text NOT NULL DEFAULT '#6b7280',
  `created_at` text NOT NULL
);

CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);

CREATE TABLE `task_tags` (
  `task_id` text NOT NULL REFERENCES `tasks`(`id`) ON DELETE CASCADE,
  `tag_id` text NOT NULL REFERENCES `tags`(`id`) ON DELETE CASCADE,
  PRIMARY KEY (`task_id`, `tag_id`)
);
