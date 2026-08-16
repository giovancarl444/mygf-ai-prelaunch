import { TRPCError } from "@trpc/server";
import { randomUUID } from "node:crypto";
import { classifyOhApiJob, getOhApiJobStatus, type OhApiResolution } from "./ohapi";
import { isRefundableProviderFailure, providerFailure } from "./ohapiErrors";
import {
  consumeOhapiAllowance,
  countOwnedOhapiMediaJobs,
  createOhapiMediaJob,
  expireOldPendingOhapiMediaJobs,
  getUserById,
  HOURLY_MEDIA_LIMIT,
  listStaleOhapiMediaJobs,
  refundOhapiAllowance,
  updateOhapiMediaJob,
} from "./ohapiDb";
import { GUEST_LIMIT_REACHED, GUEST_MEDIA_LIMIT, isGuestUser } from "./ohapiGuest";
import { authoriseMediaSpend, recordMediaSpend, refundMediaSpendForJob } from "./billing";

/**
 * Let the provider expand the prompt with its own model.
 *
 * A customer types "send me a pic", not a description of a photograph, and no
 * template we write turns one into the other. The provider's own enhancement
 * has the character and the conversation to work from, which is more than a
 * fixed phrasing of ours ever will. (Live note, 16 Aug 2026: with a deliberate
 * prompt from the generation panel, enhancement *off* ranked better and ran in
 * ~32 s instead of ~48 s — which is why the panel exposes the toggle, default
 * off, while this remains the default for conversation-sourced prompts.)
 */
export const USE_PROMPT_ENHANCEMENT = true;

/**
 * Portrait, and the largest portrait preset offered: 720×1280. A photo she
 * sends should be the shape of a photo taken on a phone.
 */
export const PHOTO_RESOLUTION: OhApiResolution = "9:16";

/**
 * The high-quality option: a true 1080×1920 render (verified live 16 Aug 2026
 * — presets are hard-capped at 1280 on the long edge, explicit sizes are not).
 * Priced at two credits rather than one because the provider's per-size cost
 * is unpublished; revisit alongside the MONETIZATION.md margin formula.
 */
export const PHOTO_RESOLUTION_HIGH: OhApiResolution = [1080, 1920];
export const HIGH_QUALITY_IMAGE_COST = 2;

/**
 * Charges one media attempt, runs the provider submission, and records the job
 * against the requesting account. A submission that never reached the provider
 * returns its attempt rather than silently costing the customer.
 *
 * Shared by the generation panel and by conversation, so that a photo asked for
 * in chat is charged, owned, and bounded exactly like one asked for directly.
 */
export async function submitMediaJob<T extends { jobId: string | null; presignedUrl: string | null }>(input: {
  userId: number;
  kind: "image" | "video" | "audio";
  prompt: string;
  ohapiCharacterId?: number | null;
  roomId?: number | null;
  /** What this generation costs when it is not the kind's base price. */
  cost?: number;
  submit: () => Promise<T>;
}) {
  // Every generation in the product goes through here, which is why the guest
  // ceiling is enforced here rather than in each router. A limit that can be
  // reached by finding another entry point is not a limit.
  // If the account cannot be read the ceiling is skipped rather than enforced
  // blindly: the hourly allowance still applies, and the same failure would
  // stop the job being recorded a moment later anyway.
  const actor = await getUserById(input.userId).catch(() => undefined);
  if (actor && isGuestUser(actor) && await countOwnedOhapiMediaJobs(actor.id) >= GUEST_MEDIA_LIMIT) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: GUEST_LIMIT_REACHED });
  }

  // What the customer is entitled to, before what the rate limiter permits.
  // The two answer different questions: this one is "have they paid for this",
  // the next is "are they going too fast".
  const spend = actor
    ? await authoriseMediaSpend({ user: actor, kind: input.kind, costOverride: input.cost }).catch(() => null)
    : null;
  if (spend && !spend.allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: spend.reason === "guest_limit"
        ? GUEST_LIMIT_REACHED
        : "You are out of credits. Top up to keep generating.",
    });
  }

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

  // Charged only once the provider has accepted the work. Taking the credit
  // before submission would bill for requests that never reached anyone, and
  // tying the charge to the job row is what lets a later failure refund
  // exactly what this generation cost.
  const chargeForJob = async (mediaJobId: number | null) => {
    if (!spend?.allowed || spend.source === "guest") return;
    await recordMediaSpend({ userId: input.userId, cost: spend.cost, mediaJobId, note: spend.source })
      .catch(error => console.error("[Billing] A spend could not be recorded:", error));
  };

  // Audio is synchronous: it answers with the finished file and no job id, so
  // there is nothing to poll. It is recorded as already complete under a local
  // identifier, which keeps one shape — a media job — for everything the
  // gallery, the transcript, and the ownership checks have to handle.
  if (!submission.jobId) {
    if (!submission.presignedUrl) return providerFailure(new Error("The provider returned no result."));
    const localJobId = `local-${input.kind}-${randomUUID()}`;
    const job = await createOhapiMediaJob({
      userId: input.userId,
      ohapiCharacterId: input.ohapiCharacterId ?? null,
      roomId: input.roomId ?? null,
      providerJobId: localJobId,
      kind: input.kind,
      prompt: input.prompt,
      resultUrl: submission.presignedUrl,
      status: "completed",
    });
    await chargeForJob(job?.id ?? null);
    return {
      jobId: localJobId,
      kind: input.kind,
      status: "completed" as const,
      remaining: allowance.remaining,
    };
  }

  // The submission's presigned URL points at an object that does not exist yet,
  // so it is deliberately not stored or returned. The result URL is recorded
  // only when the job reports completion.
  const job = await createOhapiMediaJob({
    userId: input.userId,
    ohapiCharacterId: input.ohapiCharacterId ?? null,
    roomId: input.roomId ?? null,
    providerJobId: submission.jobId,
    kind: input.kind,
    prompt: input.prompt,
  });
  await chargeForJob(job?.id ?? null);

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
export async function reconcileStaleJobs(userId: number) {
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
        // The charge happened at submission; a job the provider failed after
        // accepting owes the customer their credits back. Best effort — this
        // runs on a read path and must never break the gallery.
        if (status === "failed") {
          await refundMediaSpendForJob({ userId, mediaJobId: job.id })
            .catch(error => console.error("[Billing] A failure refund could not be recorded:", error));
        }
      } catch {
        // Leave it pending; the next gallery read will try again.
      }
    }));
  } catch (error) {
    console.error("[Media] Stale job reconciliation failed:", error);
  }
}
