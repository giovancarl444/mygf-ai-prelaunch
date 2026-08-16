CREATE TABLE `ohapi_saved_companions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`ohapiCharacterId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ohapi_saved_companions_id` PRIMARY KEY(`id`),
	CONSTRAINT `ohapi_saved_companions_user_companion_unique` UNIQUE(`userId`,`ohapiCharacterId`)
);
--> statement-breakpoint
ALTER TABLE `ohapi_saved_companions` ADD CONSTRAINT `ohapi_saved_companions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ohapi_saved_companions` ADD CONSTRAINT `ohapi_saved_companions_ohapiCharacterId_ohapi_characters_id_fk` FOREIGN KEY (`ohapiCharacterId`) REFERENCES `ohapi_characters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ohapi_saved_companions_user_created_index` ON `ohapi_saved_companions` (`userId`,`createdAt`);