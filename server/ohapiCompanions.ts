import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { getPublishedOhapiCharacterBySlug, listPublishedOhapiCharacters } from "./ohapiDb";

const worldSlugSchema = z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/);

export type PublicCompanion = {
  worldSlug: string;
  displayName: string;
  age: number | null;
  occupation: string | null;
  profileImageUrl: string | null;
  tagline: string | null;
  providerType: "ORIGINAL" | "DIGITAL_TWIN" | null;
};

/**
 * Shapes a registry row for public consumption.
 *
 * The provider character id is deliberately withheld: the public surface
 * addresses a companion by slug, so an anonymous visitor never learns the
 * identifier that provider calls are billed against.
 */
export function toPublicCompanion(row: {
  worldSlug: string;
  displayName: string;
  age: number | null;
  occupation: string | null;
  profileImageUrl: string | null;
  tagline: string | null;
  providerType: "ORIGINAL" | "DIGITAL_TWIN" | null;
}): PublicCompanion {
  return {
    worldSlug: row.worldSlug,
    displayName: row.displayName,
    age: row.age,
    occupation: row.occupation,
    profileImageUrl: row.profileImageUrl,
    tagline: row.tagline,
    providerType: row.providerType,
  };
}

export const ohapiCompanionsRouter = router({
  /** Public catalog. Every entry here is a companion that can actually be opened. */
  list: publicProcedure.query(async () => {
    const rows = await listPublishedOhapiCharacters();
    return rows.map(toPublicCompanion);
  }),

  bySlug: publicProcedure.input(z.object({ worldSlug: worldSlugSchema })).query(async ({ input }) => {
    const row = await getPublishedOhapiCharacterBySlug(input.worldSlug);
    return row ? toPublicCompanion(row) : null;
  }),
});
