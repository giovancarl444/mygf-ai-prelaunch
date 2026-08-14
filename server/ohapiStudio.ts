import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, router } from "./_core/trpc";
import { getOhApiCharacterDraftStatus, getOhApiKey, OhApiError, validateOhApiCredential } from "./ohapi";
import { createOhapiAdminAudit, getOhapiStudioSummary, listRecentOhapiAdminAudits } from "./ohapiDb";
import { providerFailure } from "./ohapiPilot";

function providerFailureClass(error: unknown) {
  if (error instanceof OhApiError) return error.status ? `provider_${error.status}` : "provider_network";
  return "provider_unknown";
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

export const ohapiStudioRouter = router({
  health: adminProcedure.query(async () => ({ configured: configured(), local: await getOhapiStudioSummary() })),
  recentActivity: adminProcedure.query(async () => listRecentOhapiAdminAudits()),
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
});
