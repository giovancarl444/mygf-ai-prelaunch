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
import { providerFailure } from "./ohapiErrors";
import { PHOTO_RESOLUTION, reconcileStaleJobs, submitMediaJob, USE_PROMPT_ENHANCEMENT } from "./ohapiMediaJobs";
import {
  getChattableOhapiCharacter,
  getOwnedOhapiMediaJob,
  getOwnedOhapiRoom,
  listOwnedOhapiMediaJobs,
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

export const ohapiMediaRouter = router({
  image: adultProcedure.input(z.object({
    worldSlug: worldSlugSchema,
    prompt: promptSchema,
  })).mutation(async ({ ctx, input }) => {
    const character = await requireCompanion(input.worldSlug);
    const room = await getOwnedOhapiRoom({ userId: ctx.user.id, ohapiCharacterId: character.id });
    return submitMediaJob({
      userId: ctx.user.id,
      kind: "image",
      prompt: input.prompt,
      ohapiCharacterId: character.id,
      roomId: room?.id ?? null,
      submit: () => requestOhApiImage({
        characterId: character.providerCharacterId!,
        // The in-room flow gives the generation the conversation's context.
        roomId: room?.providerRoomId,
        prompt: input.prompt,
        promptEnhancement: USE_PROMPT_ENHANCEMENT,
        resolution: PHOTO_RESOLUTION,
        userGender: room?.userGender ?? undefined,
      }),
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
        promptEnhancement: input.promptEnhancement ?? USE_PROMPT_ENHANCEMENT,
      }),
    });
  }),

  audio: adultProcedure.input(z.object({
    worldSlug: worldSlugSchema,
    text: z.string().trim().min(1, "Write what she should say.").max(1_000),
  })).mutation(async ({ ctx, input }) => {
    const character = await requireCompanion(input.worldSlug);
    const room = await getOwnedOhapiRoom({ userId: ctx.user.id, ohapiCharacterId: character.id });
    return submitMediaJob({
      userId: ctx.user.id,
      kind: "audio",
      prompt: input.text,
      ohapiCharacterId: character.id,
      roomId: room?.id ?? null,
      submit: () => requestOhApiAudio({
        characterId: character.providerCharacterId!,
        roomId: room?.providerRoomId,
        text: input.text,
      }),
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
        imagePrompt: null,
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
      // Owner-only. The provider rewrites the prompt before generating, and
      // this is the only place that rewrite is visible — which is what tells a
      // prompt problem apart from a model problem when a result looks poor.
      imagePrompt: ctx.user.role === "admin" ? state.imagePrompt : null,
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
