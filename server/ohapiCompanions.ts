import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { getOhApiPortraits } from "./ohapi";
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
export function toPublicCompanion(
  row: {
    worldSlug: string;
    displayName: string;
    providerCharacterId: string | null;
    age: number | null;
    occupation: string | null;
    profileImageUrl: string | null;
    tagline: string | null;
    providerType: "ORIGINAL" | "DIGITAL_TWIN" | null;
  },
  portraits?: Map<string, string>,
): PublicCompanion {
  // Stored portrait URLs expire an hour after they were synced, so a freshly
  // signed one is preferred. When none is available the card falls back to its
  // placeholder rather than rendering a link that is certain to be broken.
  const fresh = row.providerCharacterId ? portraits?.get(row.providerCharacterId) ?? null : null;

  return {
    worldSlug: row.worldSlug,
    displayName: row.displayName,
    age: row.age,
    occupation: row.occupation,
    profileImageUrl: fresh,
    tagline: row.tagline,
    providerType: row.providerType,
  };
}

/** Portrait lookup that degrades to "no portrait" instead of failing the page. */
async function freshPortraits(): Promise<Map<string, string>> {
  try {
    return await getOhApiPortraits();
  } catch (error) {
    console.error("[Companions] Portrait refresh failed:", error);
    return new Map();
  }
}

export const ohapiCompanionsRouter = router({
  /**
   * Public catalog. Every entry here is a companion that can actually be opened.
   *
   * A storage failure degrades to an empty catalog rather than a broken page:
   * these are the first queries an anonymous visitor makes, so they must not be
   * able to take the marketing site down.
   */
  list: publicProcedure.query(async () => {
    try {
      const rows = await listPublishedOhapiCharacters();
      const portraits = await freshPortraits();
      return rows.map(row => toPublicCompanion(row, portraits));
    } catch (error) {
      console.error("[Companions] Catalog unavailable:", error);
      return [] as PublicCompanion[];
    }
  }),

  bySlug: publicProcedure.input(z.object({ worldSlug: worldSlugSchema })).query(async ({ input }) => {
    try {
      const row = await getPublishedOhapiCharacterBySlug(input.worldSlug);
      if (!row) return null;
      return toPublicCompanion(row, await freshPortraits());
    } catch (error) {
      console.error("[Companions] Profile unavailable:", error);
      return null;
    }
  }),
});
