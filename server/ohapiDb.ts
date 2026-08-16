import { and, asc, desc, eq, inArray, isNull, notInArray, sql } from "drizzle-orm";
import {
  ohapiAdminAudits,
  ohapiCharacters,
  ohapiMediaJobs,
  ohapiMessages,
  ohapiRateLimits,
  ohapiReports,
  ohapiRooms,
  ohapiSavedCompanions,
  users,
  type OhapiCharacter,
} from "../drizzle/schema";
import { getDb } from "./db";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  return db;
}

/* -------------------------------------------------------------------------- */
/* Companion registry                                                          */
/* -------------------------------------------------------------------------- */

export function slugifyCompanionName(name: string, providerCharacterId: string) {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  const suffix = providerCharacterId.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(-6);
  return base ? `${base}-${suffix}` : `companion-${suffix}`;
}

export async function listPublishedOhapiCharacters() {
  const db = await requireDb();
  return db.select().from(ohapiCharacters).where(and(
    eq(ohapiCharacters.status, "approved"),
    eq(ohapiCharacters.visibility, "published"),
  )).orderBy(asc(ohapiCharacters.displayName));
}

export async function listAllOhapiCharacters() {
  const db = await requireDb();
  return db.select().from(ohapiCharacters).orderBy(asc(ohapiCharacters.displayName));
}

export async function getPublishedOhapiCharacterBySlug(worldSlug: string) {
  const db = await requireDb();
  const rows = await db.select().from(ohapiCharacters).where(and(
    eq(ohapiCharacters.worldSlug, worldSlug),
    eq(ohapiCharacters.status, "approved"),
    eq(ohapiCharacters.visibility, "published"),
  )).limit(1);
  return rows[0];
}

/** Chat resolves by slug; the slug is the public identifier of one companion. */
export async function getChattableOhapiCharacter(worldSlug: string) {
  return getPublishedOhapiCharacterBySlug(worldSlug);
}

async function getOhapiCharacterByProviderId(providerCharacterId: string) {
  const db = await requireDb();
  const rows = await db.select().from(ohapiCharacters)
    .where(eq(ohapiCharacters.providerCharacterId, providerCharacterId)).limit(1);
  return rows[0];
}

export async function getOhapiCharacterBySlug(worldSlug: string) {
  const db = await requireDb();
  const rows = await db.select().from(ohapiCharacters)
    .where(eq(ohapiCharacters.worldSlug, worldSlug)).limit(1);
  return rows[0];
}

/* -------------------------------------------------------------------------- */
/* Saved companions                                                            */
/* -------------------------------------------------------------------------- */

/** The member's saved companions as world slugs, newest first. */
export async function listSavedOhapiCharacterSlugs(userId: number): Promise<string[]> {
  const db = await requireDb();
  const rows = await db.select({ worldSlug: ohapiCharacters.worldSlug })
    .from(ohapiSavedCompanions)
    .innerJoin(ohapiCharacters, eq(ohapiSavedCompanions.ohapiCharacterId, ohapiCharacters.id))
    .where(eq(ohapiSavedCompanions.userId, userId))
    .orderBy(desc(ohapiSavedCompanions.createdAt));
  return rows.map(row => row.worldSlug);
}

/** Idempotent save: the unique pair makes a second insert a no-op. */
export async function saveOhapiCharacterForUser(userId: number, ohapiCharacterId: number) {
  const db = await requireDb();
  await db.insert(ohapiSavedCompanions).values({ userId, ohapiCharacterId })
    .onDuplicateKeyUpdate({ set: { userId } });
}

export async function unsaveOhapiCharacterForUser(userId: number, ohapiCharacterId: number) {
  const db = await requireDb();
  await db.delete(ohapiSavedCompanions)
    .where(and(eq(ohapiSavedCompanions.userId, userId), eq(ohapiSavedCompanions.ohapiCharacterId, ohapiCharacterId)));
}

export async function isOhapiCharacterSavedByUser(userId: number, ohapiCharacterId: number) {
  const db = await requireDb();
  const rows = await db.select({ id: ohapiSavedCompanions.id })
    .from(ohapiSavedCompanions)
    .where(and(eq(ohapiSavedCompanions.userId, userId), eq(ohapiSavedCompanions.ohapiCharacterId, ohapiCharacterId)))
    .limit(1);
  return rows.length > 0;
}

export type SyncCharacterInput = {
  providerCharacterId: string;
  displayName: string;
  age: number | null;
  occupation: string | null;
  profileImageUrl: string | null;
  providerType: "ORIGINAL" | "DIGITAL_TWIN" | null;
};

export class EmptyProviderLibraryError extends Error {
  constructor() {
    super("The provider returned no characters. Nothing was changed.");
    this.name = "EmptyProviderLibraryError";
  }
}

/**
 * Reconciles the local registry against the provider library.
 *
 * Keyed on `providerCharacterId` rather than `worldSlug`, because the provider
 * id is the durable identity. Matching on the slug is what allowed an existing
 * row to be silently repointed when two worlds resolved to one provider record.
 *
 * Presence and visibility are deliberately separate axes: `status` tracks
 * whether the provider still has the character, `visibility` records the
 * owner's publishing decision. Retiring only touches `status`, so a companion
 * that disappears and later returns comes back with the owner's choice intact.
 */
export async function syncOhapiCharacters(characters: readonly SyncCharacterInput[]) {
  // An empty library is far more likely to be a transient provider failure than
  // a deliberate removal of every companion, and acting on it would retire the
  // entire public catalog. Refuse rather than guess.
  if (characters.length === 0) throw new EmptyProviderLibraryError();

  const db = await requireDb();
  const now = new Date();
  let created = 0;
  let updated = 0;

  for (const character of characters) {
    const existing = await getOhapiCharacterByProviderId(character.providerCharacterId);

    if (existing) {
      await db.update(ohapiCharacters).set({
        displayName: character.displayName,
        age: character.age,
        occupation: character.occupation,
        profileImageUrl: character.profileImageUrl,
        providerType: character.providerType,
        status: "approved",
        syncedAt: now,
        approvedAt: existing.approvedAt ?? now,
      }).where(eq(ohapiCharacters.id, existing.id));
      updated += 1;
      continue;
    }

    // Resolve a free slug. A collision here means a different provider record
    // already owns the readable name, so the new row takes a distinct slug
    // instead of overwriting the incumbent.
    let worldSlug = slugifyCompanionName(character.displayName, character.providerCharacterId);
    if (await getOhapiCharacterBySlug(worldSlug)) {
      worldSlug = `${worldSlug}-${Date.now().toString(36).slice(-4)}`;
    }

    await db.insert(ohapiCharacters).values({
      worldSlug,
      displayName: character.displayName,
      providerCharacterId: character.providerCharacterId,
      age: character.age,
      occupation: character.occupation,
      profileImageUrl: character.profileImageUrl,
      providerType: character.providerType,
      status: "approved",
      visibility: "published",
      syncedAt: now,
      approvedAt: now,
    });
    created += 1;
  }

  // Anything no longer present in the provider library must stop being offered.
  // `visibility` is left alone so the owner's publish/hide choice survives a
  // disappear-and-return cycle.
  const liveIds = characters.map(character => character.providerCharacterId);
  const stale = await db.select({ id: ohapiCharacters.id }).from(ohapiCharacters).where(and(
    eq(ohapiCharacters.status, "approved"),
    notInArray(ohapiCharacters.providerCharacterId, liveIds),
  ));

  if (stale.length) {
    await db.update(ohapiCharacters)
      .set({ status: "disabled" })
      .where(inArray(ohapiCharacters.id, stale.map(row => row.id)));
  }

  return { created, updated, retired: stale.length, total: characters.length };
}

export async function setOhapiCharacterVisibility(input: { worldSlug: string; visibility: "published" | "hidden" }) {
  const db = await requireDb();
  const existing = await getOhapiCharacterBySlug(input.worldSlug);
  if (!existing) return null;
  await db.update(ohapiCharacters).set({ visibility: input.visibility }).where(eq(ohapiCharacters.id, existing.id));
  return getOhapiCharacterBySlug(input.worldSlug);
}

export async function setOhapiCharacterTagline(input: { worldSlug: string; tagline: string | null }) {
  const db = await requireDb();
  const existing = await getOhapiCharacterBySlug(input.worldSlug);
  if (!existing) return null;
  await db.update(ohapiCharacters).set({ tagline: input.tagline }).where(eq(ohapiCharacters.id, existing.id));
  return getOhapiCharacterBySlug(input.worldSlug);
}

/* -------------------------------------------------------------------------- */
/* Adult confirmation                                                          */
/* -------------------------------------------------------------------------- */

export async function getUserById(userId: number) {
  const db = await requireDb();
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return rows[0];
}

/**
 * A visitor who has confirmed their age but not created an account.
 *
 * Adult confirmation is recorded at creation because that is the only moment
 * this row is made: it exists because someone confirmed. Recording it later
 * would allow a guest to exist unconfirmed, which the generative procedures
 * would then have to reason about.
 */
export async function createGuestUser(openId: string) {
  const db = await requireDb();
  await db.insert(users).values({
    openId,
    loginMethod: "guest",
    role: "user",
    adultConfirmedAt: new Date(),
  });
  const rows = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  const user = rows[0];
  if (!user) throw new Error("The guest session could not be created.");
  return user;
}

/** Everything a guest has said, across every conversation they opened. */
export async function countOwnedOhapiUserMessages(userId: number) {
  const db = await requireDb();
  const rows = await db.select({ total: sql<number>`count(*)` })
    .from(ohapiMessages)
    .innerJoin(ohapiRooms, eq(ohapiMessages.roomId, ohapiRooms.id))
    .where(and(eq(ohapiRooms.userId, userId), eq(ohapiMessages.role, "user")));
  return Number(rows[0]?.total ?? 0);
}

export async function countOwnedOhapiMediaJobs(userId: number) {
  const db = await requireDb();
  const rows = await db.select({ total: sql<number>`count(*)` })
    .from(ohapiMediaJobs)
    .where(eq(ohapiMediaJobs.userId, userId));
  return Number(rows[0]?.total ?? 0);
}

/**
 * Moves everything a guest did onto the account they just created.
 *
 * The conversation is the reason someone signs up at that moment, so losing it
 * at the point of conversion would be the worst possible time to lose it.
 * Rooms carry their messages and media by foreign key, so re-pointing the
 * owning rows is enough — then duplicates are collapsed, because the account
 * may already hold a room with the same companion.
 */
export async function adoptGuestSession(input: { guestUserId: number; userId: number }) {
  const db = await requireDb();
  const guest = await getUserById(input.guestUserId);
  if (!guest || guest.loginMethod !== "guest" || guest.id === input.userId) return { adopted: false };

  const rooms = await db.select({ ohapiCharacterId: ohapiRooms.ohapiCharacterId })
    .from(ohapiRooms).where(eq(ohapiRooms.userId, input.guestUserId));

  await db.update(ohapiRooms).set({ userId: input.userId }).where(eq(ohapiRooms.userId, input.guestUserId));
  await db.update(ohapiMediaJobs).set({ userId: input.userId }).where(eq(ohapiMediaJobs.userId, input.guestUserId));
  await db.update(ohapiReports).set({ userId: input.userId }).where(eq(ohapiReports.userId, input.guestUserId));
  await db.delete(ohapiRateLimits).where(eq(ohapiRateLimits.userId, input.guestUserId));

  // The account may already have talked to the same companion from another
  // device. Two live rooms for one pairing is the defect dedupe exists for.
  for (const characterId of Array.from(new Set(rooms.map(room => room.ohapiCharacterId)))) {
    await dedupeOwnedOhapiRooms({ userId: input.userId, ohapiCharacterId: characterId });
  }

  await db.delete(users).where(eq(users.id, input.guestUserId));
  return { adopted: true, rooms: rooms.length };
}

export async function markUserAdultConfirmed(userId: number) {
  const db = await requireDb();
  const now = new Date();
  await db.update(users).set({ adultConfirmedAt: now }).where(eq(users.id, userId));
  return now;
}

export async function getUserAdultConfirmedAt(userId: number) {
  const db = await requireDb();
  const rows = await db.select({ adultConfirmedAt: users.adultConfirmedAt })
    .from(users).where(eq(users.id, userId)).limit(1);
  return rows[0]?.adultConfirmedAt ?? null;
}

/* -------------------------------------------------------------------------- */
/* Rooms, messages, reports                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The account's live room for one companion.
 *
 * Ordered by id so the *earliest* room always wins. Without an order the winner
 * is whatever the engine returns first, which can differ between calls and make
 * a conversation appear to jump between two rooms.
 */
export async function getOwnedOhapiRoom(input: { userId: number; ohapiCharacterId: number }) {
  const db = await requireDb();
  const rows = await db.select().from(ohapiRooms).where(and(
    eq(ohapiRooms.userId, input.userId),
    eq(ohapiRooms.ohapiCharacterId, input.ohapiCharacterId),
    isNull(ohapiRooms.deletedAt),
  )).orderBy(asc(ohapiRooms.id)).limit(1);
  return rows[0];
}

/**
 * Collapses duplicate live rooms for one account and companion down to the
 * earliest, and reports how many were retired.
 *
 * Two concurrent first messages — a double click, or two open tabs — can both
 * observe "no room yet" and each create one provider-side. The provider room
 * that loses is already paid for and cannot be recovered, but leaving it linked
 * locally would split the conversation across two rooms and keep billing for
 * both. Retiring the extras makes the local state single-valued again.
 */
export async function dedupeOwnedOhapiRooms(input: { userId: number; ohapiCharacterId: number }) {
  const db = await requireDb();
  const rows = await db.select({ id: ohapiRooms.id }).from(ohapiRooms).where(and(
    eq(ohapiRooms.userId, input.userId),
    eq(ohapiRooms.ohapiCharacterId, input.ohapiCharacterId),
    isNull(ohapiRooms.deletedAt),
  )).orderBy(asc(ohapiRooms.id));

  if (rows.length <= 1) return { kept: rows[0]?.id ?? null, retired: 0 };

  const [keep, ...extras] = rows;
  await db.update(ohapiRooms)
    .set({ deletedAt: new Date() })
    .where(inArray(ohapiRooms.id, extras.map(row => row.id)));
  return { kept: keep.id, retired: extras.length };
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
  textingStyle?: "default" | "short-form" | "long-form";
}) {
  const db = await requireDb();
  await db.insert(ohapiRooms).values({
    userId: input.userId,
    ohapiCharacterId: input.ohapiCharacterId,
    providerRoomId: input.providerRoomId,
    textingStyle: input.textingStyle ?? "default",
  });
  const room = await getOwnedOhapiRoom(input);
  if (!room) throw new Error("The new conversation room could not be loaded.");
  return room;
}

export async function setOwnedOhapiRoomTextingStyle(input: {
  userId: number;
  roomId: number;
  textingStyle: "default" | "short-form" | "long-form";
}) {
  const db = await requireDb();
  const room = await getOwnedOhapiRoomById({ userId: input.userId, roomId: input.roomId });
  if (!room) return null;
  await db.update(ohapiRooms).set({ textingStyle: input.textingStyle }).where(eq(ohapiRooms.id, room.id));
  return { ...room, textingStyle: input.textingStyle };
}

/** Live rooms an account currently holds. Bounds provider-side room creation. */
export async function countLiveOhapiRooms(userId: number) {
  const db = await requireDb();
  const rows = await db.select({ total: sql<number>`count(*)` }).from(ohapiRooms).where(and(
    eq(ohapiRooms.userId, userId),
    isNull(ohapiRooms.deletedAt),
  ));
  return Number(rows[0]?.total ?? 0);
}

/** Rooms created in the current UTC hour, including retired ones. */
export async function countOhapiRoomsCreatedThisHour(userId: number, now = new Date()) {
  const db = await requireDb();
  const hourStart = new Date(now);
  hourStart.setUTCMinutes(0, 0, 0);
  const rows = await db.select({ total: sql<number>`count(*)` }).from(ohapiRooms).where(and(
    eq(ohapiRooms.userId, userId),
    sql`${ohapiRooms.createdAt} >= ${hourStart}`,
  ));
  return Number(rows[0]?.total ?? 0);
}

export async function listOwnedOhapiRooms(userId: number) {
  const db = await requireDb();
  return db.select({
    id: ohapiRooms.id,
    title: ohapiRooms.title,
    lastUsedAt: ohapiRooms.lastUsedAt,
    worldSlug: ohapiCharacters.worldSlug,
    displayName: ohapiCharacters.displayName,
    profileImageUrl: ohapiCharacters.profileImageUrl,
  })
    .from(ohapiRooms)
    .innerJoin(ohapiCharacters, eq(ohapiRooms.ohapiCharacterId, ohapiCharacters.id))
    .where(and(eq(ohapiRooms.userId, userId), isNull(ohapiRooms.deletedAt)))
    .orderBy(desc(ohapiRooms.lastUsedAt))
    .limit(50);
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

/**
 * Retires a conversation and removes what MyGF.ai stored for it.
 *
 * Generation records for the same companion are removed too. The product tells
 * the customer that clearing removes the conversation, and leaving their
 * prompts behind under a different table would make that untrue. Reports are
 * retained deliberately — they exist for safety review — but are unlinked from
 * the deleted messages first.
 */
export async function clearOwnedOhapiRoom(input: { userId: number; roomId: number }) {
  const db = await requireDb();
  const room = await getOwnedOhapiRoomById(input);
  if (!room) return false;

  await db.update(ohapiReports).set({ messageId: null }).where(eq(ohapiReports.roomId, room.id));
  await db.delete(ohapiMediaJobs).where(and(
    eq(ohapiMediaJobs.userId, input.userId),
    eq(ohapiMediaJobs.ohapiCharacterId, room.ohapiCharacterId),
  ));
  await db.delete(ohapiMessages).where(eq(ohapiMessages.roomId, room.id));
  await db.update(ohapiRooms).set({ deletedAt: new Date(), title: null }).where(eq(ohapiRooms.id, room.id));
  return true;
}

export async function listOwnedOhapiMessages(roomId: number) {
  const db = await requireDb();
  return db.select().from(ohapiMessages).where(eq(ohapiMessages.roomId, roomId)).orderBy(asc(ohapiMessages.createdAt)).limit(200);
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

/* -------------------------------------------------------------------------- */
/* Media jobs                                                                  */
/* -------------------------------------------------------------------------- */

export async function createOhapiMediaJob(input: {
  userId: number;
  ohapiCharacterId?: number | null;
  roomId?: number | null;
  providerJobId: string;
  kind: "image" | "audio" | "video";
  prompt?: string | null;
  resultUrl?: string | null;
  /**
   * Audio answers with the finished file rather than a job, so it starts done.
   * A generation that never reached the provider starts failed, so the thread
   * can say so rather than showing nothing.
   */
  status?: "pending" | "completed" | "failed";
}) {
  const db = await requireDb();
  await db.insert(ohapiMediaJobs).values({
    userId: input.userId,
    ohapiCharacterId: input.ohapiCharacterId ?? null,
    roomId: input.roomId ?? null,
    providerJobId: input.providerJobId,
    kind: input.kind,
    status: input.status ?? "pending",
    prompt: input.prompt?.slice(0, 1_200) ?? null,
    resultUrl: input.resultUrl ?? null,
  });
  return getOwnedOhapiMediaJob({ userId: input.userId, providerJobId: input.providerJobId });
}

export async function getOwnedOhapiMediaJob(input: { userId: number; providerJobId: string }) {
  const db = await requireDb();
  const rows = await db.select().from(ohapiMediaJobs).where(and(
    eq(ohapiMediaJobs.providerJobId, input.providerJobId),
    eq(ohapiMediaJobs.userId, input.userId),
  )).limit(1);
  return rows[0];
}

export async function updateOhapiMediaJob(input: {
  id: number;
  status: "pending" | "completed" | "failed" | "expired";
  resultUrl?: string | null;
  errorMessage?: string | null;
  followupText?: string | null;
}) {
  const db = await requireDb();
  await db.update(ohapiMediaJobs).set({
    status: input.status,
    resultUrl: input.resultUrl ?? null,
    errorMessage: input.errorMessage ?? null,
    followupText: input.followupText?.slice(0, 1_200) ?? null,
  }).where(eq(ohapiMediaJobs.id, input.id));
}

/**
 * Generations that were still running when their status was last read.
 *
 * A customer who closes the tab mid-generation leaves the job pending forever,
 * because nothing else polls it. These are reconciled when the gallery is next
 * opened. Bounded, and old enough that a just-submitted job is left to the
 * foreground poller.
 */
export async function listStaleOhapiMediaJobs(input: { userId: number; now?: Date; limit?: number }) {
  const db = await requireDb();
  const now = input.now ?? new Date();
  const settleAfter = new Date(now.getTime() - 10_000);
  const giveUpBefore = new Date(now.getTime() - MEDIA_RESULT_FRESH_MS);

  return db.select().from(ohapiMediaJobs).where(and(
    eq(ohapiMediaJobs.userId, input.userId),
    eq(ohapiMediaJobs.status, "pending"),
    sql`${ohapiMediaJobs.createdAt} <= ${settleAfter}`,
    sql`${ohapiMediaJobs.createdAt} >= ${giveUpBefore}`,
  )).orderBy(desc(ohapiMediaJobs.createdAt)).limit(input.limit ?? 5);
}

/** Marks generations abandoned once their result link would have expired. */
export async function expireOldPendingOhapiMediaJobs(input: { userId: number; now?: Date }) {
  const db = await requireDb();
  const cutoff = new Date((input.now ?? new Date()).getTime() - MEDIA_RESULT_FRESH_MS);
  await db.update(ohapiMediaJobs).set({ status: "expired" }).where(and(
    eq(ohapiMediaJobs.userId, input.userId),
    eq(ohapiMediaJobs.status, "pending"),
    sql`${ohapiMediaJobs.createdAt} < ${cutoff}`,
  ));
}

/**
 * Measured against the live service: generated media is returned on a legacy
 * presigned S3 URL with `Expires` set seven days out. The gallery is bounded to
 * six days so a result is never shown after its link has died, while leaving a
 * day of margin. MyGF.ai does not re-host the asset, so this window is the only
 * thing keeping dead links off the page.
 */
export const MEDIA_RESULT_FRESH_MS = 6 * 24 * 60 * 60 * 1000;

/**
 * The generations that belong to one conversation, oldest first.
 *
 * The room is the ownership boundary here: callers resolve it through
 * `getOwnedOhapiRoom` first, so this does not re-check the account. Bounded to
 * the window in which a result link can still resolve, for the same reason the
 * gallery is.
 */
export async function listOhapiRoomMediaJobs(roomId: number, now = new Date()) {
  const db = await requireDb();
  const since = new Date(now.getTime() - MEDIA_RESULT_FRESH_MS);
  return db.select().from(ohapiMediaJobs).where(and(
    eq(ohapiMediaJobs.roomId, roomId),
    sql`${ohapiMediaJobs.createdAt} >= ${since}`,
  )).orderBy(asc(ohapiMediaJobs.createdAt)).limit(60);
}

export async function listOwnedOhapiMediaJobs(input: { userId: number; ohapiCharacterId?: number; now?: Date }) {
  const db = await requireDb();
  const since = new Date((input.now ?? new Date()).getTime() - MEDIA_RESULT_FRESH_MS);
  const filters = [
    eq(ohapiMediaJobs.userId, input.userId),
    sql`${ohapiMediaJobs.createdAt} >= ${since}`,
  ];
  if (typeof input.ohapiCharacterId === "number") {
    filters.push(eq(ohapiMediaJobs.ohapiCharacterId, input.ohapiCharacterId));
  }
  return db.select().from(ohapiMediaJobs).where(and(...filters))
    .orderBy(desc(ohapiMediaJobs.createdAt)).limit(60);
}

/* -------------------------------------------------------------------------- */
/* Rate limiting                                                               */
/* -------------------------------------------------------------------------- */

export const HOURLY_TEXT_LIMIT = 60;
export const HOURLY_MEDIA_LIMIT = 12;
export const HOURLY_ROOM_LIMIT = 12;
export const MAX_LIVE_ROOMS = 40;

export type RateScope = "text" | "media";

export function describeOhapiAllowance(used: number, limit: number, now = new Date()) {
  const resetAt = new Date(now);
  resetAt.setUTCHours(resetAt.getUTCHours() + 1, 0, 0, 0);
  return { allowed: used <= limit, used, limit, remaining: Math.max(0, limit - used), resetAt };
}

function bucketKeyFor(scope: RateScope, now: Date) {
  return `${scope}:${now.toISOString().slice(0, 13)}`;
}

/** Reads the current usage without consuming an attempt. */
export async function peekOhapiAllowance(userId: number, scope: RateScope, limit: number, now = new Date()) {
  const db = await requireDb();
  const rows = await db.select().from(ohapiRateLimits).where(and(
    eq(ohapiRateLimits.userId, userId),
    eq(ohapiRateLimits.bucketKey, bucketKeyFor(scope, now)),
  )).limit(1);
  const used = rows[0]?.requestCount ?? 0;
  return describeOhapiAllowance(used, limit, now);
}

export async function consumeOhapiAllowance(userId: number, scope: RateScope, limit: number, now = new Date()) {
  const db = await requireDb();
  const bucketKey = bucketKeyFor(scope, now);
  await db.insert(ohapiRateLimits).values({ userId, bucketKey, requestCount: 1 }).onDuplicateKeyUpdate({
    set: { requestCount: sql`${ohapiRateLimits.requestCount} + 1` },
  });
  const rows = await db.select().from(ohapiRateLimits).where(and(
    eq(ohapiRateLimits.userId, userId),
    eq(ohapiRateLimits.bucketKey, bucketKey),
  )).limit(1);
  const used = rows[0]?.requestCount ?? limit + 1;
  return describeOhapiAllowance(used, limit, now);
}

/** Returns an unused attempt to the bucket when downstream work never ran. */
export async function refundOhapiAllowance(userId: number, scope: RateScope, now = new Date()) {
  const db = await requireDb();
  await db.update(ohapiRateLimits)
    .set({ requestCount: sql`GREATEST(${ohapiRateLimits.requestCount} - 1, 0)` })
    .where(and(
      eq(ohapiRateLimits.userId, userId),
      eq(ohapiRateLimits.bucketKey, bucketKeyFor(scope, now)),
    ));
}

/* -------------------------------------------------------------------------- */
/* Owner audit                                                                 */
/* -------------------------------------------------------------------------- */

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
  "Companion library synchronized.",
  "Companion visibility updated.",
  "Companion tagline updated.",
]);

export function sanitizeOhapiAdminAuditDetail(detail?: string) {
  const normalized = detail?.trim() ?? "";
  if (!normalized) return null;
  if (
    SAFE_AUDIT_DETAILS.has(normalized) ||
    /^Status [a-z-]+\.$/i.test(normalized) ||
    /^Synced \d+ companions? \(\d+ new, \d+ updated, \d+ retired\)\.$/.test(normalized) ||
    /^provider_(400|401|403|404|422|429|500|502|503|504|network|unknown)$/.test(normalized)
  ) return normalized;
  return "sanitized";
}

export async function listRecentOhapiAdminAudits(limit = 25) {
  const db = await requireDb();
  return db.select().from(ohapiAdminAudits).orderBy(desc(ohapiAdminAudits.createdAt)).limit(limit);
}

export async function getOhapiStudioSummary() {
  const db = await requireDb();
  const [published, allCharacters, activeRooms, openReports, mediaJobs] = await Promise.all([
    db.select({ total: sql<number>`count(*)` }).from(ohapiCharacters).where(and(
      eq(ohapiCharacters.status, "approved"),
      eq(ohapiCharacters.visibility, "published"),
    )),
    db.select({ total: sql<number>`count(*)` }).from(ohapiCharacters).where(eq(ohapiCharacters.status, "approved")),
    db.select({ total: sql<number>`count(*)` }).from(ohapiRooms).where(isNull(ohapiRooms.deletedAt)),
    db.select({ total: sql<number>`count(*)` }).from(ohapiReports).where(eq(ohapiReports.status, "open")),
    db.select({ total: sql<number>`count(*)` }).from(ohapiMediaJobs),
  ]);
  return {
    publishedCompanions: Number(published[0]?.total ?? 0),
    syncedCompanions: Number(allCharacters[0]?.total ?? 0),
    activeRooms: Number(activeRooms[0]?.total ?? 0),
    openReports: Number(openReports[0]?.total ?? 0),
    mediaJobs: Number(mediaJobs[0]?.total ?? 0),
  };
}

export type { OhapiCharacter };
