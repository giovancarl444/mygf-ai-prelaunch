import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { adultProcedure } from "./ohapiAccess";
import { createOhApiRoom, generateOhApiText, requestOhApiAudio, requestOhApiImage, requestOhApiVideo } from "./ohapi";
import { type ChatMediaKind, composeMediaPrompt, detectChatMediaRequest } from "./ohapiChatIntent";
import { isRefundableProviderFailure, providerFailure } from "./ohapiErrors";
import { PHOTO_RESOLUTION, submitMediaJob, USE_PROMPT_ENHANCEMENT } from "./ohapiMediaJobs";
import {
  clearOwnedOhapiRoom,
  consumeOhapiAllowance,
  countLiveOhapiRooms,
  countOhapiRoomsCreatedThisHour,
  createOhapiMessage,
  createOhapiReport,
  createOwnedOhapiRoom,
  dedupeOwnedOhapiRooms,
  getChattableOhapiCharacter,
  getOwnedOhapiRoom,
  getUserAdultConfirmedAt,
  HOURLY_ROOM_LIMIT,
  HOURLY_TEXT_LIMIT,
  listOhapiRoomMediaJobs,
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
    const providerRoomId = await createOhApiRoom({
      characterId: input.providerCharacterId,
      // The provider keys conversation context on this, so it must be stable
      // per account and must not collide with another partner's user space.
      userId: `mygf-${input.userId}`,
    });
    await createOwnedOhapiRoom({
      userId: input.userId,
      ohapiCharacterId: input.ohapiCharacterId,
      providerRoomId,
    });

    // Two concurrent first messages can both reach this point and each create a
    // provider room. Collapse to the earliest so the conversation stays in one
    // room, then re-read the winner rather than assuming it is the row we just
    // inserted.
    await dedupeOwnedOhapiRooms({
      userId: input.userId,
      ohapiCharacterId: input.ohapiCharacterId,
    });

    const room = await getOwnedOhapiRoom({
      userId: input.userId,
      ohapiCharacterId: input.ohapiCharacterId,
    });
    if (!room) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The conversation could not be opened." });
    return room;
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    return providerFailure(error);
  }
}

/**
 * How long a generation may sit unfinished before the transcript stops showing
 * it. Nothing polls a job once the tab closes, so without this a conversation
 * would keep a spinner from last week in it forever. The gallery's reconciler
 * owns settling those.
 */
const TRANSCRIPT_PENDING_WINDOW_MS = 10 * 60 * 1000;

/**
 * Starts the generation a message asked for, without ever failing the message.
 *
 * By the time this runs the reply has already been written and charged, so a
 * spent generation allowance or a provider refusal must not take the
 * conversation down with it. She simply does not send the photo.
 */
async function startRequestedMedia(input: {
  userId: number;
  kind: ChatMediaKind;
  ohapiCharacterId: number;
  providerCharacterId: string;
  roomId: number;
  providerRoomId: string;
  message: string;
  reply: string;
  name: string;
  userGender: "male" | "female" | null;
}) {
  // What she is asked is not what should be generated. The request is turned
  // into a description first; sending the message verbatim is how you get a
  // picture of the words "trying to see if it works".
  const prompt = input.kind === "audio"
    ? input.reply
    : composeMediaPrompt({ kind: input.kind, message: input.message, name: input.name });

  try {
    const submitted = await submitMediaJob({
      userId: input.userId,
      kind: input.kind,
      // Recorded as sent, so the gallery and any later diagnosis show the
      // prompt the provider actually received.
      prompt,
      ohapiCharacterId: input.ohapiCharacterId,
      roomId: input.roomId,
      submit: () => {
        if (input.kind === "audio") {
          return requestOhApiAudio({
            characterId: input.providerCharacterId,
            roomId: input.providerRoomId,
            text: input.reply,
          });
        }
        if (input.kind === "video") {
          return requestOhApiVideo({
            characterId: input.providerCharacterId,
            prompt,
            promptEnhancement: USE_PROMPT_ENHANCEMENT,
          });
        }
        return requestOhApiImage({
          characterId: input.providerCharacterId,
          roomId: input.providerRoomId,
          prompt,
          promptEnhancement: USE_PROMPT_ENHANCEMENT,
          resolution: PHOTO_RESOLUTION,
          // Only sent when the room recorded one. Omitted, the provider
          // defaults to the opposite of the character's gender, which is a
          // better guess than any we would invent.
          userGender: input.userGender ?? undefined,
        });
      },
    });
    return { jobId: submitted.jobId, kind: input.kind };
  } catch (error) {
    console.error("[Chat] A requested generation could not be started:", error);
    return null;
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

  /**
   * The conversation, including the media in it.
   *
   * Photos, videos, and voice notes are part of the thread rather than a
   * separate collection: they are things she sent, at a point in time, often
   * with a line of her own attached. They are returned alongside the messages
   * and interleaved by timestamp.
   */
  history: protectedProcedure.input(z.object({ worldSlug: worldSlugSchema })).query(async ({ ctx, input }) => {
    const empty = {
      room: null,
      messages: [] as { id: number; role: "user" | "assistant"; content: string; createdAt: Date }[],
      media: [] as {
        jobId: string;
        kind: "image" | "video" | "audio";
        status: "pending" | "completed" | "failed";
        resultUrl: string | null;
        followupText: string | null;
        createdAt: Date;
      }[],
    };

    const character = await getChattableOhapiCharacter(input.worldSlug);
    if (!character) return empty;

    const room = await getOwnedOhapiRoom({ userId: ctx.user.id, ohapiCharacterId: character.id });
    if (!room) return empty;

    const [messages, media] = await Promise.all([
      listOwnedOhapiMessages(room.id),
      listOhapiRoomMediaJobs(room.id),
    ]);

    const staleBefore = Date.now() - TRANSCRIPT_PENDING_WINDOW_MS;
    return {
      room: { id: room.id, title: room.title },
      messages: messages.map(message => ({
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt,
      })),
      media: media
        .filter(job => {
          // A finished generation belongs in the thread for as long as its link
          // resolves. One that is still running, or that failed, is only worth
          // showing while it is recent enough to mean something.
          if (job.status === "completed") return Boolean(job.resultUrl);
          if (job.status === "expired") return false;
          return job.createdAt.getTime() > staleBefore;
        })
        .map(job => ({
          jobId: job.providerJobId,
          kind: job.kind,
          status: job.status === "completed" ? ("completed" as const)
            : job.status === "failed" ? ("failed" as const)
              : ("pending" as const),
          resultUrl: job.status === "completed" ? job.resultUrl : null,
          followupText: job.status === "completed" ? job.followupText : null,
          createdAt: job.createdAt,
        })),
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
      const reply = await generateOhApiText({
        roomId: room.providerRoomId,
        characterId: character.providerCharacterId!,
        message: input.message,
      });
      await createOhapiMessage({ roomId: room.id, role: "assistant", content: reply.content });
      await touchOhapiRoom(room.id);

      // Asking her for a photo is how you get one. The generation is started
      // here, after the reply, so it lands in the thread as something she sent
      // rather than as the output of a form.
      const requested = detectChatMediaRequest(input.message);
      const media = requested
        ? await startRequestedMedia({
          userId: ctx.user.id,
          kind: requested,
          ohapiCharacterId: character.id,
          providerCharacterId: character.providerCharacterId!,
          roomId: room.id,
          providerRoomId: room.providerRoomId,
          message: input.message,
          reply: reply.content,
          name: character.displayName.split(" ")[0] || character.displayName,
          userGender: room.userGender ?? null,
        })
        : null;

      return {
        content: reply.content,
        remaining: allowance.remaining,
        resetAt: allowance.resetAt,
        media,
        // Owner-only diagnostic. The provider signals something here that the
        // reply text does not express, and its shape needs observing before any
        // behaviour is built on it.
        toolCall: ctx.user.role === "admin" ? reply.toolCall : null,
      };
    } catch (error) {
      if (isRefundableProviderFailure(error)) await refundOhapiAllowance(ctx.user.id, "text");
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
