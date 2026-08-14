import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router } from "./_core/trpc";
import { adultProcedure } from "./ohapiAccess";
import {
  classifyOhApiJob,
  getOhApiJobStatus,
  requestOhApiAudio,
  requestOhApiImage,
  requestOhApiVideo,
} from "./ohapi";
import { isRefundableProviderFailure, providerFailure } from "./ohapiErrors";
import {
  consumeOhapiAllowance,
  createOhapiMediaJob,
  expireOldPendingOhapiMediaJobs,
  getChattableOhapiCharacter,
  getOwnedOhapiMediaJob,
  HOURLY_MEDIA_LIMIT,
  listOwnedOhapiMediaJobs,
  listStaleOhapiMediaJobs,
  refundOhapiAllowance,
  updateOhapiMediaJob,
} from "./ohapiDb";

const worldSlugSchema = z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/);
const promptSchema = z.string().trim().min(1, "Describe what you want first.").max(1_200);

async function requireCompanion(worldSlug: string) {
  const character = await getChattableOhapiCharacter(worldSlug);
  if (!character?.providerCharacterId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "That companion is not available right now." });
  }
  return character;
}

/**
 * Charges one media attempt, runs the provider submission, and records the job
 * against the requesting account. A submission that never reached the provider
 * returns its attempt rather than silently costing the customer.
 */
async function submitMediaJob<T extends { jobId: string; presignedUrl: string | null }>(input: {
  userId: number;
  kind: "image" | "video" | "audio";
  prompt: string;
  ohapiCharacterId?: number | null;
  submit: () => Promise<T>;
}) {
  const allowance = await consumeOhapiAllowance(input.userId, "media", HOURLY_MEDIA_LIMIT);
  if (!allowance.allowed) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `You have reached this hour's generation limit. It resets at ${allowance.resetAt.toISOString().slice(11, 16)} UTC.`,
    });
  }

  let submission: T;
  try {
    submission = await input.submit();
  } catch (error) {
    if (isRefundableProviderFailure(error)) await refundOhapiAllowance(input.userId, "media");
    return providerFailure(error);
  }

  // The submission's presigned URL points at an object that does not exist yet,
  // so it is deliberately not stored or returned. The result URL is recorded
  // only when the job reports completion.
  await createOhapiMediaJob({
    userId: input.userId,
    ohapiCharacterId: input.ohapiCharacterId ?? null,
    providerJobId: submission.jobId,
    kind: input.kind,
    prompt: input.prompt,
  });

  return {
    jobId: submission.jobId,
    kind: input.kind,
    status: "pending" as const,
    remaining: allowance.remaining,
  };
}

/**
 * Settles generations that finished while nobody was watching.
 *
 * Best effort by design: this runs on a read path, so a provider hiccup must
 * leave the gallery working rather than fail it. Jobs too old for their result
 * link to still resolve are marked expired instead of polled forever.
 */
async function reconcileStaleJobs(userId: number) {
  try {
    await expireOldPendingOhapiMediaJobs({ userId });
    const stale = await listStaleOhapiMediaJobs({ userId });
    if (!stale.length) return;

    await Promise.all(stale.map(async job => {
      try {
        const state = await getOhApiJobStatus(job.providerJobId);
        const status = classifyOhApiJob(state);
        if (status === "pending") return;
        await updateOhapiMediaJob({
          id: job.id,
          status,
          resultUrl: state.presignedUrl,
          followupText: status === "completed" ? state.followupText : null,
          errorMessage: status === "failed" ? "generation_failed" : null,
        });
      } catch {
        // Leave it pending; the next gallery read will try again.
      }
    }));
  } catch (error) {
    console.error("[Media] Stale job reconciliation failed:", error);
  }
}

export const ohapiMediaRouter = router({
  image: adultProcedure.input(z.object({
    worldSlug: worldSlugSchema,
    prompt: promptSchema,
  })).mutation(async ({ ctx, input }) => {
    const character = await requireCompanion(input.worldSlug);
    return submitMediaJob({
      userId: ctx.user.id,
      kind: "image",
      prompt: input.prompt,
      ohapiCharacterId: character.id,
      submit: () => requestOhApiImage({ characterId: character.providerCharacterId!, prompt: input.prompt }),
    });
  }),

  video: adultProcedure.input(z.object({
    worldSlug: worldSlugSchema.optional(),
    imageUrl: z.string().url().max(2_048)
      .refine(value => value.startsWith("https://"), { message: "Source images must be served over HTTPS." })
      .optional(),
    prompt: promptSchema,
    promptEnhancement: z.boolean().optional(),
  }).refine(value => Boolean(value.worldSlug) !== Boolean(value.imageUrl), {
    message: "Choose either a companion or a source image, not both.",
  })).mutation(async ({ ctx, input }) => {
    const character = input.worldSlug ? await requireCompanion(input.worldSlug) : null;
    return submitMediaJob({
      userId: ctx.user.id,
      kind: "video",
      prompt: input.prompt,
      ohapiCharacterId: character?.id ?? null,
      submit: () => requestOhApiVideo({
        characterId: character?.providerCharacterId ?? undefined,
        imageUrl: input.imageUrl,
        prompt: input.prompt,
        promptEnhancement: input.promptEnhancement,
      }),
    });
  }),

  audio: adultProcedure.input(z.object({
    worldSlug: worldSlugSchema,
    text: z.string().trim().min(1, "Write what she should say.").max(1_000),
  })).mutation(async ({ ctx, input }) => {
    const character = await requireCompanion(input.worldSlug);
    return submitMediaJob({
      userId: ctx.user.id,
      kind: "audio",
      prompt: input.text,
      ohapiCharacterId: character.id,
      submit: () => requestOhApiAudio({ characterId: character.providerCharacterId!, text: input.text }),
    });
  }),

  /** Polls one job. Ownership is checked locally before the provider is asked. */
  jobStatus: adultProcedure.input(z.object({
    jobId: z.string().trim().min(1).max(160),
  })).query(async ({ ctx, input }) => {
    const job = await getOwnedOhapiMediaJob({ userId: ctx.user.id, providerJobId: input.jobId });
    if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "That generation is no longer available." });

    if (job.status === "completed" || job.status === "failed") {
      return {
        jobId: input.jobId,
        kind: job.kind,
        status: job.status,
        resultUrl: job.resultUrl,
        followupText: job.followupText,
        errorMessage: job.errorMessage,
      };
    }

    let state;
    try {
      state = await getOhApiJobStatus(input.jobId);
    } catch (error) {
      return providerFailure(error);
    }

    const nextStatus = classifyOhApiJob(state);

    if (nextStatus !== "pending") {
      await updateOhapiMediaJob({
        id: job.id,
        status: nextStatus,
        resultUrl: state.presignedUrl,
        followupText: nextStatus === "completed" ? state.followupText : null,
        // The provider's failure text is not surfaced to the customer.
        errorMessage: nextStatus === "failed" ? "generation_failed" : null,
      });
    }

    return {
      jobId: input.jobId,
      kind: job.kind,
      status: nextStatus,
      // Only hand back a URL once the job is genuinely finished. The submission
      // response carries a presigned URL up front, and serving that early would
      // show the customer an empty or partial asset.
      resultUrl: nextStatus === "completed" ? state.presignedUrl : null,
      followupText: nextStatus === "completed" ? state.followupText : null,
      errorMessage: nextStatus === "failed" ? "That generation could not be completed. Please try a different prompt." : null,
    };
  }),

  gallery: adultProcedure.input(z.object({
    worldSlug: worldSlugSchema.optional(),
  })).query(async ({ ctx, input }) => {
    // Nothing polls a generation once its tab closes, so it would stay pending
    // forever and never reach the gallery. Settle a bounded number here.
    await reconcileStaleJobs(ctx.user.id);

    const character = input.worldSlug ? await getChattableOhapiCharacter(input.worldSlug) : null;
    const jobs = await listOwnedOhapiMediaJobs({
      userId: ctx.user.id,
      ohapiCharacterId: character?.id,
    });
    return jobs
      .filter(job => job.status === "completed" && job.resultUrl)
      .map(job => ({
        jobId: job.providerJobId,
        kind: job.kind,
        resultUrl: job.resultUrl,
        prompt: job.prompt,
        followupText: job.followupText,
        createdAt: job.createdAt,
      }));
  }),
});
