CREATE TABLE `ohapi_admin_audits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`action` varchar(80) NOT NULL,
	`providerIdentifier` varchar(160),
	`outcome` enum('succeeded','failed') NOT NULL,
	`detail` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ohapi_admin_audits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `ohapi_admin_audits` ADD CONSTRAINT `ohapi_admin_audits_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ohapi_admin_audits_user_created_index` ON `ohapi_admin_audits` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `ohapi_admin_audits_created_index` ON `ohapi_admin_audits` (`createdAt`);