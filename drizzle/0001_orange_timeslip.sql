CREATE TABLE `beta_interests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`interest` enum('story/character continuity','reflective conversation','imaginative roleplay','curious about AI'),
	`source` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `beta_interests_id` PRIMARY KEY(`id`),
	CONSTRAINT `beta_interests_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','user') NOT NULL DEFAULT 'user';