CREATE TABLE `ohapi_rate_limits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`bucketKey` varchar(32) NOT NULL,
	`requestCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ohapi_rate_limits_id` PRIMARY KEY(`id`),
	CONSTRAINT `ohapi_rate_limits_user_bucket_unique` UNIQUE(`userId`,`bucketKey`)
);
--> statement-breakpoint
CREATE TABLE `ohapi_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`roomId` int NOT NULL,
	`messageId` int,
	`reason` enum('safety','quality','other') NOT NULL,
	`detail` varchar(800),
	`status` enum('open','reviewed','closed') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ohapi_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `ohapi_rooms` ADD `title` varchar(120);--> statement-breakpoint
ALTER TABLE `ohapi_rooms` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `ohapi_rate_limits` ADD CONSTRAINT `ohapi_rate_limits_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ohapi_reports` ADD CONSTRAINT `ohapi_reports_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ohapi_reports` ADD CONSTRAINT `ohapi_reports_roomId_ohapi_rooms_id_fk` FOREIGN KEY (`roomId`) REFERENCES `ohapi_rooms`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ohapi_reports` ADD CONSTRAINT `ohapi_reports_messageId_ohapi_messages_id_fk` FOREIGN KEY (`messageId`) REFERENCES `ohapi_messages`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ohapi_reports_user_created_index` ON `ohapi_reports` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `ohapi_reports_room_index` ON `ohapi_reports` (`roomId`);