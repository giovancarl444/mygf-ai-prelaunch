import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { adultProcedure } from "./ohapiAccess";
import { createOhApiRoom, generateOhApiText } from "./ohapi";
import { providerFailure } from "./ohapiErrors";
import {
  clearOwnedOhapiRoom,
  consumeOhapiAllowance,
  countLiveOhapiRooms,
  countOhapiRoomsCreatedThisHour,
  createOhapiMessage,
  createOhapiReport,
  createOwnedOhapiRoom,
  getChattableOhapiCharacter,
  getOwnedOhapiRoom,
  getUserAdultConfirmedAt,
  HOURLY_ROOM_LIMIT,
  HOURLY_TEXT_LIMIT,
  listOwnedOhapiMessages,
  listOwnedOhapiRooms,
  markUserAdultConfirmed,
  MAX_LIVE_ROOMS,
  peekOhapiAllowance,
  refundOhapiAllowance,
  renameOwnedOhapiRoom,
  touchOhapiRoom,
} from "./ohapiDb";

const worldSlugSchema = z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/);

async function requireCompanion(worldSlug: string) {
  const character = await getChattableOhapiCharacter(worldSlug);
  if (!character?.providerCharacterId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "That companion is not available right now." });
  }
  return character;
}

/**
 * Resolves the account's room for a companion, creating one only when needed.
 *
 * Room creation is bounded independently of the message allowance. Retiring a
 * thread and starting again is a legitimate action, but it creates a real
 * provider-side room each time, so it cannot be unlimited.
 */
async function ensureOwnedRoom(input: { userId: number; ohapiCharacterId: number; providerCharacterId: string }) {
  const existing = await getOwnedOhapiRoom({ userId: input.userId, ohapiCharacterId: input.ohapiCharacterId });
  if (existing) return existing;

  const [liveRooms, roomsThisHour] = await Promise.all([
    countLiveOhapiRooms(input.userId),
    countOhapiRoomsCreatedThisHour(input.userId),
  ]);

  if (roomsThisHour >= HOURLY_ROOM_LIMIT) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "You have started a lot of new conversations this hour. Please try again shortly.",
    });
  }
  if (liveRooms >= MAX_LIVE_ROOMS) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "You have reached the maximum number of open conversations. Clear one to start another.",
    });
  }

  try {
    const providerRoomId = await createOhApiRoom({ characterId: input.providerCharacterId });
    return await createOwnedOhapiRoom({
      userId: input.userId,
      ohapiCharacterId: input.ohapiCharacterId,
      providerRoomId,
    });
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    return providerFailure(error);
  }
}

export const ohapiChatRouter = router({
  /** Account state the chat UI needs before it can send anything. */
  session: protectedProcedure.query(async ({ ctx }) => {
    const [textAllowance, threads, adultConfirmedAt] = await Promise.all([
      peekOhapiAllowance(ctx.user.id, "text", HOURLY_TEXT_LIMIT),
      listOwnedOhapiRooms(ctx.user.id),
      getUserAdultConfirmedAt(ctx.user.id),
    ]);
    return {
      adultConfirmed: Boolean(adultConfirmedAt),
      messagesRemaining: textAllowance.remaining,
      messageLimit: HOURLY_TEXT_LIMIT,
      threads,
    };
  }),

  confirmAdult: protectedProcedure.mutation(async ({ ctx }) => {
    const confirmedAt = await markUserAdultConfirmed(ctx.user.id);
    return { adultConfirmed: true, confirmedAt };
  }),

  history: protectedProcedure.input(z.object({ worldSlug: worldSlugSchema })).query(async ({ ctx, input }) => {
    const character = await getChattableOhapiCharacter(input.worldSlug);
    if (!character) return { room: null, messages: [] as { role: "user" | "assistant"; content: string; id: number }[] };

    const room = await getOwnedOhapiRoom({ userId: ctx.user.id, ohapiCharacterId: character.id });
    const messages = room ? await listOwnedOhapiMessages(room.id) : [];
    return {
      room: room ? { id: room.id, title: room.title } : null,
      messages: messages.map(message => ({ id: message.id, role: message.role, content: message.content })),
    };
  }),

  send: adultProcedure.input(z.object({
    worldSlug: worldSlugSchema,
    message: z.string().trim().min(1, "Write a message before sending.").max(2_000, "Messages are limited to 2,000 characters."),
  })).mutation(async ({ ctx, input }) => {
    const character = await requireCompanion(input.worldSlug);

    // The allowance is consumed before any provider-side resource is created,
    // so an over-limit account cannot leave rooms behind on the way to a 429.
    const allowance = await consumeOhapiAllowance(ctx.user.id, "text", HOURLY_TEXT_LIMIT);
    if (!allowance.allowed) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `You have reached this hour's message limit. It resets at ${allowance.resetAt.toISOString().slice(11, 16)} UTC.`,
      });
    }

    let room;
    try {
      room = await ensureOwnedRoom({
        userId: ctx.user.id,
        ohapiCharacterId: character.id,
        providerCharacterId: character.providerCharacterId!,
      });
    } catch (error) {
      await refundOhapiAllowance(ctx.user.id, "text");
      throw error;
    }

    await createOhapiMessage({ roomId: room.id, role: "user", content: input.message });

    try {
      const content = await generateOhApiText({
        roomId: room.providerRoomId,
        characterId: character.providerCharacterId!,
        message: input.message,
      });
      await createOhapiMessage({ roomId: room.id, role: "assistant", content });
      await touchOhapiRoom(room.id);
      return { content, remaining: allowance.remaining, resetAt: allowance.resetAt };
    } catch (error) {
      return providerFailure(error);
    }
  }),

  renameThread: protectedProcedure.input(z.object({
    roomId: z.number().int().positive(),
    title: z.string().trim().min(1).max(120),
  })).mutation(async ({ ctx, input }) => {
    const room = await renameOwnedOhapiRoom({ userId: ctx.user.id, roomId: input.roomId, title: input.title });
    if (!room) throw new TRPCError({ code: "NOT_FOUND", message: "This conversation is no longer available." });
    return { id: room.id, title: room.title };
  }),

  clearThread: protectedProcedure.input(z.object({ roomId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const cleared = await clearOwnedOhapiRoom({ userId: ctx.user.id, roomId: input.roomId });
    if (!cleared) throw new TRPCError({ code: "NOT_FOUND", message: "This conversation is no longer available." });
    return { cleared: true };
  }),

  report: protectedProcedure.input(z.object({
    roomId: z.number().int().positive(),
    messageId: z.number().int().positive().optional(),
    reason: z.enum(["safety", "quality", "other"]),
    detail: z.string().trim().max(800).optional(),
  })).mutation(async ({ ctx, input }) => {
    const submitted = await createOhapiReport({ ...input, userId: ctx.user.id });
    if (!submitted) throw new TRPCError({ code: "NOT_FOUND", message: "That report target is no longer available." });
    return { submitted: true };
  }),
});
