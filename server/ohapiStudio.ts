import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, router } from "./_core/trpc";
import {
  generateOhApiCharacterDraft,
  getOhApiCharacterDraftStatus,
  getOhApiKey,
  listOhApiCharacters,
  OhApiError,
  validateOhApiCredential,
  saveOhApiCharacterDraft,
} from "./ohapi";
import { providerFailure, providerFailureClass } from "./ohapiErrors";
import {
  createOhapiAdminAudit,
  EmptyProviderLibraryError,
  getOhapiStudioSummary,
  listAllOhapiCharacters,
  listRecentOhapiAdminAudits,
  setOhapiCharacterTagline,
  setOhapiCharacterVisibility,
  syncOhapiCharacters,
} from "./ohapiDb";

const worldSlugSchema = z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/);

const characterDraftSchema = z.object({
  nationality: z.string().trim().min(2).max(100),
  ethnicity: z.string().trim().min(2).max(100),
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  biography: z.string().trim().min(20).max(1_200),
  gender: z.enum(["Female", "Male"]),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use an ISO date in YYYY-MM-DD format."),
  job: z.string().trim().min(2).max(120).optional(),
  whereYouLive: z.string().trim().min(2).max(160).optional(),
}).superRefine((input, ctx) => {
  const date = new Date(`${input.dateOfBirth}T00:00:00Z`);
  const age = Math.floor((Date.now() - date.getTime()) / (365.2425 * 24 * 60 * 60 * 1000));
  if (Number.isNaN(date.getTime()) || age < 21) {
    ctx.addIssue({ code: "custom", path: ["dateOfBirth"], message: "Every companion must be clearly 21 or older." });
  }
});

/**
 * A draft only becomes a companion once the provider reports `saved` and hands
 * back a durable id that matches the one being approved.
 */
export function requireSavedProviderCharacterId(
  draft: { status?: string; characterId?: string },
  expectedProviderCharacterId: string,
) {
  if (draft.status !== "saved" || typeof draft.characterId !== "string" || draft.characterId !== expectedProviderCharacterId) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "This candidate must finish saving with a matching durable provider ID before it can be approved.",
    });
  }
  return draft.characterId;
}

export function summarizeOhApiLibrary(payload: unknown) {
  if (!payload || typeof payload !== "object") return [];
  return Object.entries(payload as Record<string, unknown>)
    .map(([section, value]) => ({ section, count: Array.isArray(value) ? value.length : value && typeof value === "object" ? 1 : 0 }))
    .filter(item => item.count > 0)
    .slice(0, 12);
}

function configured() {
  try { getOhApiKey(); return true; } catch { return false; }
}

export type CredentialState = "missing" | "ok" | "rejected" | "unreachable";

/**
 * Actually exercises the credential rather than checking it is non-empty.
 *
 * A present-but-dead key previously reported as "configured", so the first sign
 * of trouble was a failed sync with a deliberately vague customer-facing
 * message. This is owner-only, so it reports the real reason.
 */
export async function checkOhApiCredential(): Promise<{ state: CredentialState; detail: string }> {
  if (!configured()) {
    return { state: "missing", detail: "OHAPI_API_KEY is not set on the server." };
  }
  try {
    await validateOhApiCredential();
    return { state: "ok", detail: "The provider accepted this credential." };
  } catch (error) {
    if (error instanceof OhApiError && (error.status === 401 || error.status === 403)) {
      // The provider's own wording is the useful part here — "API key is
      // disabled" and "Invalid API key" are different problems.
      return { state: "rejected", detail: error.message || `The provider rejected this credential (${error.status}).` };
    }
    if (error instanceof OhApiError) {
      return { state: "unreachable", detail: `The provider could not be reached${error.status ? ` (${error.status})` : ""}.` };
    }
    return { state: "unreachable", detail: "The provider could not be reached." };
  }
}

export const ohapiStudioRouter = router({
  health: adminProcedure.query(async () => {
    const [credential, local] = await Promise.all([checkOhApiCredential(), getOhapiStudioSummary()]);
    return { configured: credential.state === "ok", credential, local };
  }),

  recentActivity: adminProcedure.query(async () => listRecentOhapiAdminAudits()),

  /** Owner view of the registry, including hidden and retired rows. */
  companions: adminProcedure.query(async () => {
    const rows = await listAllOhapiCharacters();
    return rows.map(row => ({
      worldSlug: row.worldSlug,
      displayName: row.displayName,
      providerCharacterId: row.providerCharacterId,
      age: row.age,
      occupation: row.occupation,
      profileImageUrl: row.profileImageUrl,
      tagline: row.tagline,
      providerType: row.providerType,
      status: row.status,
      visibility: row.visibility,
      syncedAt: row.syncedAt,
    }));
  }),

  /**
   * Reconciles the public catalog against `GET /api/v1/characters`.
   *
   * This is what makes the site show real companions: the catalog is derived
   * from the provider library instead of hand-authored marketing entries.
   */
  syncCompanions: adminProcedure.mutation(async ({ ctx }) => {
    try {
      const characters = await listOhApiCharacters();
      const result = await syncOhapiCharacters(characters.map(character => ({
        providerCharacterId: character.characterId,
        displayName: character.name,
        age: character.age,
        occupation: character.occupation,
        profileImageUrl: character.profileImageUrl,
        providerType: character.type,
      })));
      await createOhapiAdminAudit({
        userId: ctx.user.id,
        action: "companion_library_synced",
        outcome: "succeeded",
        detail: `Synced ${result.total} companions (${result.created} new, ${result.updated} updated, ${result.retired} retired).`,
      });
      return result;
    } catch (error) {
      await createOhapiAdminAudit({
        userId: ctx.user.id,
        action: "companion_library_synced",
        outcome: "failed",
        detail: providerFailureClass(error),
      });
      if (error instanceof EmptyProviderLibraryError) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The provider returned no characters, so the catalog was left untouched. Check the account and try again.",
        });
      }
      if (error instanceof TRPCError) throw error;
      // This surface is owner-only, so the actual provider reason is more
      // useful than the customer-safe copy the rest of the app returns.
      if (error instanceof OhApiError && (error.status === 401 || error.status === 403)) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `The provider rejected the server credential: ${error.message || error.status}. Update OHAPI_API_KEY and try again.`,
        });
      }
      return providerFailure(error);
    }
  }),

  setVisibility: adminProcedure.input(z.object({
    worldSlug: worldSlugSchema,
    visibility: z.enum(["published", "hidden"]),
  })).mutation(async ({ ctx, input }) => {
    const updated = await setOhapiCharacterVisibility(input);
    if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "That companion is not in the registry." });
    await createOhapiAdminAudit({
      userId: ctx.user.id,
      action: "companion_visibility_updated",
      providerIdentifier: updated.providerCharacterId ?? undefined,
      outcome: "succeeded",
      detail: "Companion visibility updated.",
    });
    return { worldSlug: updated.worldSlug, visibility: updated.visibility };
  }),

  setTagline: adminProcedure.input(z.object({
    worldSlug: worldSlugSchema,
    tagline: z.string().trim().max(240),
  })).mutation(async ({ ctx, input }) => {
    const updated = await setOhapiCharacterTagline({ worldSlug: input.worldSlug, tagline: input.tagline || null });
    if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "That companion is not in the registry." });
    await createOhapiAdminAudit({
      userId: ctx.user.id,
      action: "companion_tagline_updated",
      providerIdentifier: updated.providerCharacterId ?? undefined,
      outcome: "succeeded",
      detail: "Companion tagline updated.",
    });
    return { worldSlug: updated.worldSlug, tagline: updated.tagline };
  }),

  refreshLibrary: adminProcedure.mutation(async ({ ctx }) => {
    try {
      const library = await validateOhApiCredential();
      await createOhapiAdminAudit({ userId: ctx.user.id, action: "provider_library_refreshed", outcome: "succeeded", detail: "Read-only customer-library refresh." });
      return { sections: summarizeOhApiLibrary(library) };
    } catch (error) {
      await createOhapiAdminAudit({ userId: ctx.user.id, action: "provider_library_refreshed", outcome: "failed", detail: providerFailureClass(error) });
      return providerFailure(error);
    }
  }),

  inspectDraft: adminProcedure.input(z.object({ characterGuid: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    try {
      const draft = await getOhApiCharacterDraftStatus(input.characterGuid);
      await createOhapiAdminAudit({ userId: ctx.user.id, action: "draft_inspected", providerIdentifier: input.characterGuid, outcome: "succeeded", detail: typeof draft.status === "string" ? `Status ${draft.status}.` : "Status read." });
      return { status: typeof draft.status === "string" ? draft.status : "unknown", characterId: typeof draft.characterId === "string" ? draft.characterId : null };
    } catch (error) {
      await createOhapiAdminAudit({ userId: ctx.user.id, action: "draft_inspected", providerIdentifier: input.characterGuid, outcome: "failed", detail: providerFailureClass(error) });
      if (error instanceof TRPCError) throw error;
      return providerFailure(error);
    }
  }),

  /* ---------------------------------------------------------------------- */
  /* Companion creation lifecycle — owner-only, and only reachable here.     */
  /* ---------------------------------------------------------------------- */

  generateDraft: adminProcedure.input(characterDraftSchema).mutation(async ({ ctx, input }) => {
    try {
      const draft = await generateOhApiCharacterDraft(input);
      await createOhapiAdminAudit({
        userId: ctx.user.id,
        action: "draft_generated",
        providerIdentifier: draft.characterGuid,
        outcome: "succeeded",
        detail: "Private candidate generated; review required before save.",
      });
      return draft;
    } catch (error) {
      await createOhapiAdminAudit({ userId: ctx.user.id, action: "draft_generated", outcome: "failed", detail: providerFailureClass(error) });
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

  saveDraft: adminProcedure.input(z.object({ characterGuid: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    try {
      const result = await saveOhApiCharacterDraft(input.characterGuid);
      await createOhapiAdminAudit({
        userId: ctx.user.id,
        action: "draft_save_requested",
        providerIdentifier: input.characterGuid,
        outcome: "succeeded",
        detail: "Save request accepted; provider confirmation pending.",
      });
      return result;
    } catch (error) {
      await createOhapiAdminAudit({ userId: ctx.user.id, action: "draft_save_requested", providerIdentifier: input.characterGuid, outcome: "failed", detail: providerFailureClass(error) });
      return providerFailure(error);
    }
  }),
});
