CREATE TABLE `credit_ledger` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`delta` int NOT NULL,
	`reason` enum('purchase','grant','spend','refund','expiry','correction') NOT NULL,
	`mediaJobId` int,
	`paymentId` int,
	`note` varchar(240),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `credit_ledger_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` varchar(32) NOT NULL,
	`providerRef` varchar(191) NOT NULL,
	`kind` enum('subscription','credits') NOT NULL,
	`planId` varchar(32),
	`creditsGranted` int,
	`amountCents` int NOT NULL,
	`currency` varchar(12) NOT NULL,
	`status` enum('pending','settled','refunded','disputed','failed') NOT NULL DEFAULT 'pending',
	`settledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `payments_providerRef_unique` UNIQUE(`providerRef`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`planId` varchar(32) NOT NULL,
	`status` enum('active','past_due','cancelled','expired') NOT NULL DEFAULT 'active',
	`currentPeriodStart` timestamp NOT NULL,
	`currentPeriodEnd` timestamp NOT NULL,
	`cancelAtPeriodEnd` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `credit_ledger` ADD CONSTRAINT `credit_ledger_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `credit_ledger` ADD CONSTRAINT `credit_ledger_mediaJobId_ohapi_media_jobs_id_fk` FOREIGN KEY (`mediaJobId`) REFERENCES `ohapi_media_jobs`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `credit_ledger_user_created_index` ON `credit_ledger` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `payments_user_created_index` ON `payments` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `payments_provider_status_index` ON `payments` (`provider`,`status`);--> statement-breakpoint
CREATE INDEX `subscriptions_user_index` ON `subscriptions` (`userId`);--> statement-breakpoint
CREATE INDEX `subscriptions_status_period_index` ON `subscriptions` (`status`,`currentPeriodEnd`);