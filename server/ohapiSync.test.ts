import { describe, expect, it } from "vitest";
import { classifyOhApiJob, isCompletedOhApiJobStatus, isFailedOhApiJobStatus, OhApiError } from "./ohapi";
import { isRefundableProviderFailure } from "./ohapiErrors";
import { EmptyProviderLibraryError, slugifyCompanionName, syncOhapiCharacters } from "./ohapiDb";
import { balancedFeaturedCount } from "../client/src/pages/Home";

describe("companion library sync safety", () => {
  /**
   * An empty provider response is far more likely to be a transient failure
   * than a deliberate removal of every companion. Acting on it would retire the
   * entire public catalog in one call.
   */
  it("refuses to reconcile against an empty provider library", async () => {
    await expect(syncOhapiCharacters([])).rejects.toBeInstanceOf(EmptyProviderLibraryError);
  });
});

describe("companion slugs", () => {
  it("builds a readable slug suffixed by the durable provider id", () => {
    expect(slugifyCompanionName("Ada Lovelace", "char-124875")).toBe("ada-lovelace-124875");
  });

  it("strips accents rather than dropping the name", () => {
    expect(slugifyCompanionName("Zoë Renée", "abc123")).toBe("zoe-renee-abc123");
  });

  it("still produces a usable slug for a name with no latin characters", () => {
    expect(slugifyCompanionName("こんにちは", "xyz789")).toBe("companion-xyz789");
  });

  it("does not collapse two different characters onto one slug", () => {
    expect(slugifyCompanionName("Mia", "aaa111")).not.toBe(slugifyCompanionName("Mia", "bbb222"));
  });
});

/**
 * The submission response carries a `presigned_url` before any work is done, so
 * completion must be decided by `status`. Treating a URL as proof of completion
 * would report every job as finished the moment it was queued.
 */
describe("media job classification", () => {
  it("does not treat a presigned URL alone as completion", () => {
    expect(classifyOhApiJob({ status: "queued", presignedUrl: "https://x.test/a.png", errorMessage: null, followupText: null })).toBe("pending");
    expect(classifyOhApiJob({ status: "processing", presignedUrl: "https://x.test/a.png", errorMessage: null, followupText: null })).toBe("pending");
  });

  it("completes only when the status says so and a URL is present", () => {
    expect(classifyOhApiJob({ status: "completed", presignedUrl: "https://x.test/a.png", errorMessage: null, followupText: null })).toBe("completed");
    expect(classifyOhApiJob({ status: "completed", presignedUrl: null, errorMessage: null, followupText: null })).toBe("pending");
  });

  it("treats documented and adjacent failure states as failed", () => {
    for (const status of ["failed", "error", "cancelled"]) {
      expect(classifyOhApiJob({ status, presignedUrl: null, errorMessage: "x", followupText: null })).toBe("failed");
    }
  });

  it("recognizes the status vocabulary it classifies on", () => {
    expect(isCompletedOhApiJobStatus("succeeded")).toBe(true);
    expect(isCompletedOhApiJobStatus("queued")).toBe(false);
    expect(isFailedOhApiJobStatus("error")).toBe(true);
    expect(isFailedOhApiJobStatus("processing")).toBe(false);
  });
});

describe("allowance refunds", () => {
  it("refunds infrastructure failures the customer did not cause", () => {
    expect(isRefundableProviderFailure(new OhApiError("upstream", 500))).toBe(true);
    expect(isRefundableProviderFailure(new OhApiError("unreachable"))).toBe(true);
  });

  /**
   * The line is whether the customer did anything wrong. Only the request
   * itself is chargeable, so a rejected prompt cannot be retried without bound.
   */
  it("charges a rejection of the request itself", () => {
    expect(isRefundableProviderFailure(new OhApiError("declined", 400))).toBe(false);
    expect(isRefundableProviderFailure(new OhApiError("incomplete", 422))).toBe(false);
  });

  /**
   * On this service 403 covers both an invalid key and an exhausted credit
   * balance, and 429 is the provider throttling us, not the customer — our
   * own hourly allowance is what bounds them. None of it is theirs to pay for.
   */
  it("returns the attempt for anything on our side of the boundary", () => {
    expect(isRefundableProviderFailure(new OhApiError("invalid key or no credit", 403))).toBe(true);
    expect(isRefundableProviderFailure(new OhApiError("unauthorized", 401))).toBe(true);
    expect(isRefundableProviderFailure(new OhApiError("busy", 429))).toBe(true);
  });

  it("ignores errors that did not come from the provider", () => {
    expect(isRefundableProviderFailure(new Error("something else"))).toBe(false);
  });
});

/**
 * Home renders three across on a wide screen (four only at 1480px+). A count
 * that is not a multiple of three would strand cards on their own row, which
 * reads as a rendering fault rather than a design choice. Updated with the
 * discovery redesign (M1); the property itself is unchanged.
 */
describe("featured grid balance", () => {
  it("never leaves a stranded partial row", () => {
    expect(balancedFeaturedCount(0)).toBe(0);
    expect(balancedFeaturedCount(2)).toBe(2);
    expect(balancedFeaturedCount(3)).toBe(3);
    expect(balancedFeaturedCount(4)).toBe(3);
    expect(balancedFeaturedCount(5)).toBe(3);
    expect(balancedFeaturedCount(7)).toBe(6);
    expect(balancedFeaturedCount(8)).toBe(6);
    expect(balancedFeaturedCount(40)).toBe(9);
  });
});
