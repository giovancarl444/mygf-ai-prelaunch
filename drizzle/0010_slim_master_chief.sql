CREATE TABLE `auth_login_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tokenHash` varchar(64) NOT NULL,
	`email` varchar(320) NOT NULL,
	`requestNonce` varchar(64) NOT NULL,
	`requestedIp` varchar(64),
	`expiresAt` timestamp NOT NULL,
	`consumedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auth_login_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_login_tokens_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE INDEX `auth_login_tokens_email_created_index` ON `auth_login_tokens` (`email`,`createdAt`);--> statement-breakpoint
CREATE INDEX `auth_login_tokens_expires_index` ON `auth_login_tokens` (`expiresAt`);