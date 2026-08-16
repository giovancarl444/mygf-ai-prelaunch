import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { isGuestUser } from "./ohapiGuest";
import {
  getOhapiCharacterBySlug,
  isOhapiCharacterSavedByUser,
  listSavedOhapiCharacterSlugs,
  saveOhapiCharacterForUser,
  unsaveOhapiCharacterForUser,
} from "./ohapiDb";

/**
 * A member's saved companions. The browser kept this in localStorage until
 * this existed; the account-owned list is the one that survives a cleared
 * browser, and guests are told to create an account rather than accumulating
 * rows that outlive their cookie.
 */

const worldSlugSchema = z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/);

function requireMember(user: { id: number; openId: string }) {
  if (isGuestUser(user)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Saving companions is a member feature. Create an account to keep your collection.",
    });
  }
}

export const ohapiCollectionRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    requireMember(ctx.user);
    return { worldSlugs: await listSavedOhapiCharacterSlugs(ctx.user.id) };
  }),

  toggle: protectedProcedure.input(z.object({
    worldSlug: worldSlugSchema,
  })).mutation(async ({ ctx, input }) => {
    requireMember(ctx.user);

    const character = await getOhapiCharacterBySlug(input.worldSlug);
    // A hidden or unsynced companion can still be *unsaved* by anyone who
    // saved it earlier, but it cannot be newly saved.
    if (!character) throw new TRPCError({ code: "NOT_FOUND", message: "That companion does not exist." });

    const saved = await isOhapiCharacterSavedByUser(ctx.user.id, character.id);
    if (saved) {
      await unsaveOhapiCharacterForUser(ctx.user.id, character.id);
      return { saved: false };
    }
    if (character.visibility !== "published") {
      throw new TRPCError({ code: "NOT_FOUND", message: "That companion is not available right now." });
    }
    await saveOhapiCharacterForUser(ctx.user.id, character.id);
    return { saved: true };
  }),
});
