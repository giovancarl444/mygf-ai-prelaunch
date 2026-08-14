CREATE TABLE `ohapi_characters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`worldSlug` varchar(120) NOT NULL,
	`displayName` varchar(160) NOT NULL,
	`providerCharacterId` varchar(128),
	`status` enum('draft','approved','disabled') NOT NULL DEFAULT 'draft',
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ohapi_characters_id` PRIMARY KEY(`id`),
	CONSTRAINT `ohapi_characters_worldSlug_unique` UNIQUE(`worldSlug`),
	CONSTRAINT `ohapi_characters_providerCharacterId_unique` UNIQUE(`providerCharacterId`)
);
--> statement-breakpoint
CREATE TABLE `ohapi_media_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` int,
	`providerJobId` varchar(160) NOT NULL,
	`kind` enum('image','audio','video') NOT NULL,
	`status` enum('pending','completed','failed','expired') NOT NULL DEFAULT 'pending',
	`resultKey` varchar(512),
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ohapi_media_jobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `ohapi_media_jobs_providerJobId_unique` UNIQUE(`providerJobId`)
);
--> statement-breakpoint
CREATE TABLE `ohapi_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` int NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`providerRequestId` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ohapi_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ohapi_rooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`ohapiCharacterId` int NOT NULL,
	`providerRoomId` varchar(160) NOT NULL,
	`textingStyle` enum('default','short-form','long-form') NOT NULL DEFAULT 'default',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastUsedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ohapi_rooms_id` PRIMARY KEY(`id`),
	CONSTRAINT `ohapi_rooms_providerRoomId_unique` UNIQUE(`providerRoomId`),
	CONSTRAINT `ohapi_rooms_user_character_unique` UNIQUE(`userId`,`ohapiCharacterId`)
);
--> statement-breakpoint
ALTER TABLE `ohapi_media_jobs` ADD CONSTRAINT `ohapi_media_jobs_roomId_ohapi_rooms_id_fk` FOREIGN KEY (`roomId`) REFERENCES `ohapi_rooms`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ohapi_messages` ADD CONSTRAINT `ohapi_messages_roomId_ohapi_rooms_id_fk` FOREIGN KEY (`roomId`) REFERENCES `ohapi_rooms`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ohapi_rooms` ADD CONSTRAINT `ohapi_rooms_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ohapi_rooms` ADD CONSTRAINT `ohapi_rooms_ohapiCharacterId_ohapi_characters_id_fk` FOREIGN KEY (`ohapiCharacterId`) REFERENCES `ohapi_characters`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ohapi_media_jobs_room_index` ON `ohapi_media_jobs` (`roomId`);--> statement-breakpoint
CREATE INDEX `ohapi_messages_room_created_index` ON `ohapi_messages` (`roomId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `ohapi_rooms_user_index` ON `ohapi_rooms` (`userId`);