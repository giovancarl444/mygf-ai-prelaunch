import { TRPCError } from "@trpc/server";
import { OhApiError } from "./ohapi";

/**
 * Translates a provider failure into product-safe copy.
 *
 * Provider response bodies, upstream identifiers, and the API key never reach
 * this output — only the status class is used to choose a message.
 */
export function providerFailure(error: unknown): never {
  if (error instanceof OhApiError) {
    if (error.status === 400) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "That request was declined by content moderation. Please rephrase it and try again.",
      });
    }
    // The live API returns 403 for an invalid key as well as for insufficient
    // credit, so neither status can be attributed to one cause. Verified against
    // api.oh.xyz: a malformed key responds 403 {"message":"Invalid API key"}.
    if (error.status === 401 || error.status === 403) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "The companion service is unavailable right now. Please try again shortly.",
      });
    }
    if (error.status === 404) {
      throw new TRPCError({ code: "NOT_FOUND", message: "That companion or resource is no longer available." });
    }
    if (error.status === 422) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "That request was incomplete. Please adjust it and try again." });
    }
    if (error.status === 429) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "The companion service is busy. Please wait a moment and try again." });
    }
  }
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The companion service is temporarily unavailable." });
}

/**
 * Whether a failed attempt should be returned to the account's allowance.
 *
 * The line is whether the customer did anything wrong. A moderation rejection
 * (400) or a malformed request (422) is the request itself, so it costs an
 * attempt and cannot be retried without bound.
 *
 * Everything else is our side of the boundary and the customer received
 * nothing: unreachable, upstream error, provider busy — and 401/403, which on
 * this service covers both an invalid key and an exhausted credit balance.
 * Charging someone for our billing state is not defensible.
 */
export function isRefundableProviderFailure(error: unknown) {
  if (!(error instanceof OhApiError)) return false;
  if (error.status === undefined) return true; // network / unreachable
  return error.status !== 400 && error.status !== 422;
}

/** Collapses a failure into an allowlisted audit classification. */
export function providerFailureClass(error: unknown) {
  if (error instanceof OhApiError) return error.status ? `provider_${error.status}` : "provider_network";
  if (error instanceof TRPCError && error.code === "PRECONDITION_FAILED") return "provider_unknown";
  return "provider_unknown";
}
