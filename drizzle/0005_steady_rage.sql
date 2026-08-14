ALTER TABLE `ohapi_rooms` DROP INDEX `ohapi_rooms_user_character_unique`;--> statement-breakpoint
CREATE INDEX `ohapi_rooms_user_character_index` ON `ohapi_rooms` (`userId`,`ohapiCharacterId`);