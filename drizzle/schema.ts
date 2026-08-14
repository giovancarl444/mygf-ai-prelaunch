import { index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["admin", "user"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const betaInterests = mysqlTable("beta_interests", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  interest: mysqlEnum("interest", [
    "story/character continuity",
    "reflective conversation",
    "imaginative roleplay",
    "curious about AI",
  ]),
  source: varchar("source", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const ohapiCharacters = mysqlTable("ohapi_characters", {
  id: int("id").autoincrement().primaryKey(),
  worldSlug: varchar("worldSlug", { length: 120 }).notNull().unique(),
  displayName: varchar("displayName", { length: 160 }).notNull(),
  providerCharacterId: varchar("providerCharacterId", { length: 128 }).unique(),
  status: mysqlEnum("status", ["draft", "approved", "disabled"]).default("draft").notNull(),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const ohapiRooms = mysqlTable("ohapi_rooms", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  ohapiCharacterId: int("ohapiCharacterId").notNull().references(() => ohapiCharacters.id),
  providerRoomId: varchar("providerRoomId", { length: 160 }).notNull().unique(),
  userGender: mysqlEnum("userGender", ["male", "female"]).notNull(),
  textingStyle: mysqlEnum("textingStyle", ["default", "short-form", "long-form"]).default("default").notNull(),
  title: varchar("title", { length: 120 }),
  deletedAt: timestamp("deletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastUsedAt: timestamp("lastUsedAt").defaultNow().notNull(),
}, table => ({
  userCharacterIndex: index("ohapi_rooms_user_character_index").on(table.userId, table.ohapiCharacterId),
  userIndex: index("ohapi_rooms_user_index").on(table.userId),
}));

export const ohapiMessages = mysqlTable("ohapi_messages", {
  id: int("id").autoincrement().primaryKey(),
  roomId: int("roomId").notNull().references(() => ohapiRooms.id),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  providerRequestId: varchar("providerRequestId", { length: 160 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  roomCreatedIndex: index("ohapi_messages_room_created_index").on(table.roomId, table.createdAt),
}));

export const ohapiMediaJobs = mysqlTable("ohapi_media_jobs", {
  id: int("id").autoincrement().primaryKey(),
  roomId: int("roomId").references(() => ohapiRooms.id),
  providerJobId: varchar("providerJobId", { length: 160 }).notNull().unique(),
  kind: mysqlEnum("kind", ["image", "audio", "video"]).notNull(),
  status: mysqlEnum("status", ["pending", "completed", "failed", "expired"]).default("pending").notNull(),
  resultKey: varchar("resultKey", { length: 512 }),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  roomIndex: index("ohapi_media_jobs_room_index").on(table.roomId),
}));

export const ohapiReports = mysqlTable("ohapi_reports", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  roomId: int("roomId").notNull().references(() => ohapiRooms.id),
  messageId: int("messageId").references(() => ohapiMessages.id),
  reason: mysqlEnum("reason", ["safety", "quality", "other"]).notNull(),
  detail: varchar("detail", { length: 800 }),
  status: mysqlEnum("status", ["open", "reviewed", "closed"]).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  userCreatedIndex: index("ohapi_reports_user_created_index").on(table.userId, table.createdAt),
  roomIndex: index("ohapi_reports_room_index").on(table.roomId),
}));

export const ohapiRateLimits = mysqlTable("ohapi_rate_limits", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  bucketKey: varchar("bucketKey", { length: 32 }).notNull(),
  requestCount: int("requestCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  userBucketUnique: uniqueIndex("ohapi_rate_limits_user_bucket_unique").on(table.userId, table.bucketKey),
}));

export const ohapiAdminAudits = mysqlTable("ohapi_admin_audits", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  action: varchar("action", { length: 80 }).notNull(),
  providerIdentifier: varchar("providerIdentifier", { length: 160 }),
  outcome: mysqlEnum("outcome", ["succeeded", "failed"]).notNull(),
  detail: varchar("detail", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  userCreatedIndex: index("ohapi_admin_audits_user_created_index").on(table.userId, table.createdAt),
  createdIndex: index("ohapi_admin_audits_created_index").on(table.createdAt),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type BetaInterest = typeof betaInterests.$inferSelect;
export type InsertBetaInterest = typeof betaInterests.$inferInsert;
export type OhapiCharacter = typeof ohapiCharacters.$inferSelect;
export type InsertOhapiCharacter = typeof ohapiCharacters.$inferInsert;
export type OhapiRoom = typeof ohapiRooms.$inferSelect;
export type InsertOhapiRoom = typeof ohapiRooms.$inferInsert;
export type OhapiMessage = typeof ohapiMessages.$inferSelect;
export type InsertOhapiMessage = typeof ohapiMessages.$inferInsert;
export type OhapiMediaJob = typeof ohapiMediaJobs.$inferSelect;
export type InsertOhapiMediaJob = typeof ohapiMediaJobs.$inferInsert;
export type OhapiReport = typeof ohapiReports.$inferSelect;
export type InsertOhapiReport = typeof ohapiReports.$inferInsert;
export type OhapiRateLimit = typeof ohapiRateLimits.$inferSelect;
export type InsertOhapiRateLimit = typeof ohapiRateLimits.$inferInsert;
export type OhapiAdminAudit = typeof ohapiAdminAudits.$inferSelect;
export type InsertOhapiAdminAudit = typeof ohapiAdminAudits.$inferInsert;
