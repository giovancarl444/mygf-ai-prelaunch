import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import {
  ohapiAdminAudits,
  InsertOhapiCharacter,
  ohapiCharacters,
  ohapiMessages,
  ohapiRateLimits,
  ohapiReports,
  ohapiRooms,
} from "../drizzle/schema";
import { getDb } from "./db";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  return db;
}

export async function listApprovedOhapiCharacters() {
  const db = await requireDb();
  return db.select().from(ohapiCharacters).where(eq(ohapiCharacters.status, "approved"));
}

export async function getApprovedOhapiCharacter(worldSlug: string) {
  const db = await requireDb();
  const rows = await db.select().from(ohapiCharacters).where(and(
    eq(ohapiCharacters.worldSlug, worldSlug),
    eq(ohapiCharacters.status, "approved"),
  )).limit(1);
  return rows[0];
}

export async function upsertApprovedOhapiCharacter(input: Pick<InsertOhapiCharacter, "worldSlug" | "displayName" | "providerCharacterId">) {
  const db = await requireDb();
  const now = new Date();
  await db.insert(ohapiCharacters).values({
    ...input,
    status: "approved",
    approvedAt: now,
  }).onDuplicateKeyUpdate({
    set: {
      displayName: input.displayName,
      providerCharacterId: input.providerCharacterId,
      status: "approved",
      approvedAt: now,
    },
  });
  return getApprovedOhapiCharacter(input.worldSlug);
}

export async function getOwnedOhapiRoom(input: { userId: number; ohapiCharacterId: number }) {
  const db = await requireDb();
  const rows = await db.select().from(ohapiRooms).where(and(
    eq(ohapiRooms.userId, input.userId),
    eq(ohapiRooms.ohapiCharacterId, input.ohapiCharacterId),
    isNull(ohapiRooms.deletedAt),
  )).limit(1);
  return rows[0];
}

export async function getOwnedOhapiRoomById(input: { userId: number; roomId: number }) {
  const db = await requireDb();
  const rows = await db.select().from(ohapiRooms).where(and(
    eq(ohapiRooms.id, input.roomId),
    eq(ohapiRooms.userId, input.userId),
    isNull(ohapiRooms.deletedAt),
  )).limit(1);
  return rows[0];
}

export async function createOwnedOhapiRoom(input: {
  userId: number;
  ohapiCharacterId: number;
  providerRoomId: string;
  userGender: "male" | "female";
  textingStyle: "default" | "short-form" | "long-form";
}) {
  const db = await requireDb();
  await db.insert(ohapiRooms).values(input);
  const room = await getOwnedOhapiRoom(input);
  if (!room) throw new Error("The new conversation room could not be loaded.");
  return room;
}

export async function touchOhapiRoom(roomId: number) {
  const db = await requireDb();
  await db.update(ohapiRooms).set({ lastUsedAt: new Date() }).where(eq(ohapiRooms.id, roomId));
}

export async function renameOwnedOhapiRoom(input: { userId: number; roomId: number; title: string }) {
  const db = await requireDb();
  const room = await getOwnedOhapiRoomById({ userId: input.userId, roomId: input.roomId });
  if (!room) return null;
  await db.update(ohapiRooms).set({ title: input.title }).where(eq(ohapiRooms.id, room.id));
  return getOwnedOhapiRoomById({ userId: input.userId, roomId: room.id });
}

export async function clearOwnedOhapiRoom(input: { userId: number; roomId: number }) {
  const db = await requireDb();
  const room = await getOwnedOhapiRoomById(input);
  if (!room) return false;
  await db.update(ohapiReports).set({ messageId: null }).where(eq(ohapiReports.roomId, room.id));
  await db.delete(ohapiMessages).where(eq(ohapiMessages.roomId, room.id));
  await db.update(ohapiRooms).set({ deletedAt: new Date(), title: null }).where(eq(ohapiRooms.id, room.id));
  return true;
}

export async function listOwnedOhapiMessages(roomId: number) {
  const db = await requireDb();
  return db.select().from(ohapiMessages).where(eq(ohapiMessages.roomId, roomId)).orderBy(asc(ohapiMessages.createdAt)).limit(100);
}

export async function createOhapiMessage(input: {
  roomId: number;
  role: "user" | "assistant";
  content: string;
  providerRequestId?: string;
}) {
  const db = await requireDb();
  await db.insert(ohapiMessages).values(input);
}

export async function getOwnedOhapiMessage(input: { userId: number; roomId: number; messageId: number }) {
  const db = await requireDb();
  const room = await getOwnedOhapiRoomById({ userId: input.userId, roomId: input.roomId });
  if (!room) return null;
  const rows = await db.select().from(ohapiMessages).where(and(
    eq(ohapiMessages.id, input.messageId),
    eq(ohapiMessages.roomId, room.id),
  )).limit(1);
  return rows[0] ?? null;
}

export async function createOhapiReport(input: {
  userId: number;
  roomId: number;
  messageId?: number;
  reason: "safety" | "quality" | "other";
  detail?: string;
}) {
  const db = await requireDb();
  const room = await getOwnedOhapiRoomById({ userId: input.userId, roomId: input.roomId });
  if (!room) return null;
  if (input.messageId) {
    const message = await getOwnedOhapiMessage({ userId: input.userId, roomId: room.id, messageId: input.messageId });
    if (!message) return null;
  }
  await db.insert(ohapiReports).values({
    userId: input.userId,
    roomId: room.id,
    messageId: input.messageId ?? null,
    reason: input.reason,
    detail: input.detail?.trim() || null,
  });
  return true;
}

export const HOURLY_TEXT_LIMIT = 8;

export function describeOhapiTextAllowance(used: number, now = new Date()) {
  const resetAt = new Date(now);
  resetAt.setUTCHours(resetAt.getUTCHours() + 1, 0, 0, 0);
  return { allowed: used <= HOURLY_TEXT_LIMIT, used, remaining: Math.max(0, HOURLY_TEXT_LIMIT - used), resetAt };
}

export async function consumeOhapiTextAllowance(userId: number, now = new Date()) {
  const db = await requireDb();
  const bucketKey = now.toISOString().slice(0, 13);
  await db.insert(ohapiRateLimits).values({ userId, bucketKey, requestCount: 1 }).onDuplicateKeyUpdate({
    set: { requestCount: sql`${ohapiRateLimits.requestCount} + 1` },
  });
  const rows = await db.select().from(ohapiRateLimits).where(and(
    eq(ohapiRateLimits.userId, userId),
    eq(ohapiRateLimits.bucketKey, bucketKey),
  )).limit(1);
  const used = rows[0]?.requestCount ?? HOURLY_TEXT_LIMIT + 1;
  return describeOhapiTextAllowance(used, now);
}

export async function createOhapiAdminAudit(input: {
  userId: number;
  action: string;
  providerIdentifier?: string;
  outcome: "succeeded" | "failed";
  detail?: string;
}) {
  const db = await requireDb();
  await db.insert(ohapiAdminAudits).values({
    userId: input.userId,
    action: input.action,
    providerIdentifier: input.providerIdentifier?.trim() || null,
    outcome: input.outcome,
    detail: sanitizeOhapiAdminAuditDetail(input.detail),
  });
}

const SAFE_AUDIT_DETAILS = new Set([
  "Private candidate generated; review required before save.",
  "Save request accepted; provider confirmation pending.",
  "World mapping approved.",
  "Read-only customer-library refresh.",
  "Status read.",
]);

export function sanitizeOhapiAdminAuditDetail(detail?: string) {
  const normalized = detail?.trim() ?? "";
  if (!normalized) return null;
  if (SAFE_AUDIT_DETAILS.has(normalized) || /^Status [a-z-]+\.$/i.test(normalized) || /^provider_(400|401|403|404|422|429|500|502|503|504|network|unknown)$/.test(normalized)) return normalized;
  return "sanitized";
}

export async function listRecentOhapiAdminAudits(limit = 25) {
  const db = await requireDb();
  return db.select().from(ohapiAdminAudits).orderBy(desc(ohapiAdminAudits.createdAt)).limit(limit);
}

export async function getOhapiStudioSummary() {
  const db = await requireDb();
  const [approved, activeRooms, openReports] = await Promise.all([
    db.select({ total: sql<number>`count(*)` }).from(ohapiCharacters).where(eq(ohapiCharacters.status, "approved")),
    db.select({ total: sql<number>`count(*)` }).from(ohapiRooms).where(isNull(ohapiRooms.deletedAt)),
    db.select({ total: sql<number>`count(*)` }).from(ohapiReports).where(eq(ohapiReports.status, "open")),
  ]);
  return {
    approvedCharacters: Number(approved[0]?.total ?? 0),
    activeRooms: Number(activeRooms[0]?.total ?? 0),
    openReports: Number(openReports[0]?.total ?? 0),
  };
}
