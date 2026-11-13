ALTER TABLE `scores` ADD COLUMN `depth` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `scores` ADD COLUMN `tier` text DEFAULT 'free' NOT NULL;
--> statement-breakpoint
CREATE TABLE `plays` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`wallet` text,
	`tier` text NOT NULL,
	`day` text NOT NULL,
	`created_at` integer NOT NULL
);
