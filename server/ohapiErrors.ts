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
    if (error.status === 401) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "The companion service is not connected right now." });
    }
    if (error.status === 403) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "This capability is not enabled on the current plan, or the account is out of credit.",
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
 * Infrastructure failures are refunded because the customer did nothing wrong
 * and received nothing. A moderation rejection (400) is not refunded, so a
 * rejected prompt still costs an attempt and cannot be retried without bound.
 */
export function isRefundableProviderFailure(error: unknown) {
  if (!(error instanceof OhApiError)) return false;
  if (error.status === undefined) return true; // network / unreachable
  return error.status >= 500;
}

/** Collapses a failure into an allowlisted audit classification. */
export function providerFailureClass(error: unknown) {
  if (error instanceof OhApiError) return error.status ? `provider_${error.status}` : "provider_network";
  if (error instanceof TRPCError && error.code === "PRECONDITION_FAILED") return "provider_unknown";
  return "provider_unknown";
}
