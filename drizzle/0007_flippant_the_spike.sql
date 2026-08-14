ALTER TABLE `ohapi_rooms` MODIFY COLUMN `userGender` enum('male','female');--> statement-breakpoint
ALTER TABLE `ohapi_characters` ADD `visibility` enum('published','hidden') DEFAULT 'published' NOT NULL;--> statement-breakpoint
ALTER TABLE `ohapi_characters` ADD `age` int;--> statement-breakpoint
ALTER TABLE `ohapi_characters` ADD `occupation` varchar(160);--> statement-breakpoint
ALTER TABLE `ohapi_characters` ADD `profileImageUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `ohapi_characters` ADD `tagline` varchar(240);--> statement-breakpoint
ALTER TABLE `ohapi_characters` ADD `providerType` enum('ORIGINAL','DIGITAL_TWIN');--> statement-breakpoint
ALTER TABLE `ohapi_characters` ADD `syncedAt` timestamp;--> statement-breakpoint
ALTER TABLE `ohapi_media_jobs` ADD `userId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `ohapi_media_jobs` ADD `ohapiCharacterId` int;--> statement-breakpoint
ALTER TABLE `ohapi_media_jobs` ADD `prompt` varchar(1200);--> statement-breakpoint
ALTER TABLE `ohapi_media_jobs` ADD `resultUrl` varchar(2048);--> statement-breakpoint
ALTER TABLE `users` ADD `adultConfirmedAt` timestamp;--> statement-breakpoint
ALTER TABLE `ohapi_media_jobs` ADD CONSTRAINT `ohapi_media_jobs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ohapi_media_jobs` ADD CONSTRAINT `ohapi_media_jobs_ohapiCharacterId_ohapi_characters_id_fk` FOREIGN KEY (`ohapiCharacterId`) REFERENCES `ohapi_characters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ohapi_characters_visibility_index` ON `ohapi_characters` (`visibility`,`status`);--> statement-breakpoint
CREATE INDEX `ohapi_media_jobs_user_created_index` ON `ohapi_media_jobs` (`userId`,`createdAt`);