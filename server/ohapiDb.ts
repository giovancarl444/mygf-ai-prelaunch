import { and, asc, eq } from "drizzle-orm";
import {
  InsertOhapiCharacter,
  ohapiCharacters,
  ohapiMessages,
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
