import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  createOhApiRoom,
  generateOhApiCharacterDraft,
  generateOhApiText,
  getOhApiCharacterDraftStatus,
  OhApiError,
  saveOhApiCharacterDraft,
} from "./ohapi";
import {
  createOhapiMessage,
  createOwnedOhapiRoom,
  getApprovedOhapiCharacter,
  getOwnedOhapiRoom,
  listApprovedOhapiCharacters,
  listOwnedOhapiMessages,
  touchOhapiRoom,
  upsertApprovedOhapiCharacter,
} from "./ohapiDb";

const worldSlugSchema = z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/);
const setupSchema = z.object({
  worldSlug: worldSlugSchema,
  userGender: z.enum(["male", "female"]),
  textingStyle: z.enum(["default", "short-form", "long-form"]).default("default"),
});

const characterDraftSchema = z.object({
  nationality: z.string().trim().min(2).max(100),
  ethnicity: z.string().trim().min(2).max(100),
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  biography: z.string().trim().min(20).max(1_200),
  gender: z.enum(["Female", "Male"]),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use an ISO date in YYYY-MM-DD format."),
}).superRefine((input, ctx) => {
  const date = new Date(`${input.dateOfBirth}T00:00:00Z`);
  const age = Math.floor((Date.now() - date.getTime()) / (365.2425 * 24 * 60 * 60 * 1000));
  if (Number.isNaN(date.getTime()) || age < 21) {
    ctx.addIssue({ code: "custom", path: ["dateOfBirth"], message: "Every companion must be clearly 21 or older." });
  }
});

function providerFailure(error: unknown): never {
  if (error instanceof OhApiError) {
    if (error.status === 400) throw new TRPCError({ code: "BAD_REQUEST", message: "The provider could not accept that message. Please revise it and try again." });
    if (error.status === 401 || error.status === 403) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "The pilot connection is not enabled for this action yet." });
    if (error.status === 429) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "The companion service is busy. Please wait a moment and try again." });
  }
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The companion service is temporarily unavailable." });
}

async function ensureOwnedRoom(input: z.infer<typeof setupSchema> & { userId: number }) {
  const character = await getApprovedOhapiCharacter(input.worldSlug);
  if (!character?.providerCharacterId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "This companion is not enabled for the live pilot yet." });
  }

  const existing = await getOwnedOhapiRoom({ userId: input.userId, ohapiCharacterId: character.id });
  if (existing) return { character, room: existing };

  try {
    const providerRoomId = await createOhApiRoom({
      userGender: input.userGender,
      characterId: character.providerCharacterId,
      textingStyle: input.textingStyle,
    });
    const room = await createOwnedOhapiRoom({
      userId: input.userId,
      ohapiCharacterId: character.id,
      providerRoomId,
      userGender: input.userGender,
      textingStyle: input.textingStyle,
    });
    return { character, room };
  } catch (error) {
    return providerFailure(error);
  }
}

export const ohapiPilotRouter = router({
  published: protectedProcedure.query(async () => listApprovedOhapiCharacters()),
  history: protectedProcedure.input(z.object({ worldSlug: worldSlugSchema })).query(async ({ ctx, input }) => {
    const character = await getApprovedOhapiCharacter(input.worldSlug);
    if (!character) return { character: null, messages: [] };
    const room = await getOwnedOhapiRoom({ userId: ctx.user.id, ohapiCharacterId: character.id });
    return { character, messages: room ? await listOwnedOhapiMessages(room.id) : [] };
  }),
  open: protectedProcedure.input(setupSchema).mutation(async ({ ctx, input }) => {
    const { character, room } = await ensureOwnedRoom({ ...input, userId: ctx.user.id });
    return { character, roomId: room.id };
  }),
  send: protectedProcedure.input(setupSchema.extend({
    prompt: z.string().trim().min(1, "Write a message before sending.").max(1_200, "Messages are limited to 1,200 characters for the pilot."),
  })).mutation(async ({ ctx, input }) => {
    const { room } = await ensureOwnedRoom({ ...input, userId: ctx.user.id });
    await createOhapiMessage({ roomId: room.id, role: "user", content: input.prompt });
    try {
      const content = await generateOhApiText({ roomId: room.providerRoomId, prompt: input.prompt });
      await createOhapiMessage({ roomId: room.id, role: "assistant", content });
      await touchOhapiRoom(room.id);
      return { content };
    } catch (error) {
      return providerFailure(error);
    }
  }),
  admin: router({
    generateDraft: adminProcedure.input(characterDraftSchema).mutation(async ({ input }) => {
      try {
        return await generateOhApiCharacterDraft(input);
      } catch (error) {
        return providerFailure(error);
      }
    }),
    draftStatus: adminProcedure.input(z.object({ characterGuid: z.string().uuid() })).query(async ({ input }) => {
      try {
        return await getOhApiCharacterDraftStatus(input.characterGuid);
      } catch (error) {
        return providerFailure(error);
      }
    }),
    saveDraft: adminProcedure.input(z.object({ characterGuid: z.string().uuid() })).mutation(async ({ input }) => {
      try {
        return await saveOhApiCharacterDraft(input.characterGuid);
      } catch (error) {
        return providerFailure(error);
      }
    }),
    mapApprovedCharacter: adminProcedure.input(z.object({
      worldSlug: worldSlugSchema,
      displayName: z.string().trim().min(2).max(160),
      providerCharacterId: z.string().trim().min(1).max(128),
    })).mutation(async ({ input }) => upsertApprovedOhapiCharacter(input)),
  }),
});
