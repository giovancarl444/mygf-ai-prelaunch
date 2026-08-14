import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { OhApiError } from "./ohapi";
import { providerFailure } from "./ohapiPilot";

function createAnonymousContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("OhAPI pilot authorization", () => {
  it("rejects unauthenticated companion discovery", async () => {
    const caller = appRouter.createCaller(createAnonymousContext());
    await expect(caller.ohapiPilot.published()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects unauthenticated owner mapping requests", async () => {
    const caller = appRouter.createCaller(createAnonymousContext());
    await expect(caller.ohapiPilot.admin.mapApprovedCharacter({
      worldSlug: "sienna-vale",
      displayName: "Sienna Vale",
      providerCharacterId: "provider-id",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects unauthenticated character-generation requests", async () => {
    const caller = appRouter.createCaller(createAnonymousContext());
    await expect(caller.ohapiPilot.admin.generateDraft({
      nationality: "American",
      ethnicity: "Caucasian",
      firstName: "Sienna",
      lastName: "Vale",
      biography: "A fictional adult AI world with a bright, observant point of view.",
      gender: "Female",
      dateOfBirth: "1998-05-19",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("OhAPI pilot provider-error mapping", () => {
  const scenarios = [
    { status: 400, code: "BAD_REQUEST", message: "The provider could not accept that message. Please revise it and try again." },
    { status: 401, code: "PRECONDITION_FAILED", message: "The pilot connection is not enabled for this action yet." },
    { status: 403, code: "PRECONDITION_FAILED", message: "The pilot connection is not enabled for this action yet." },
    { status: 429, code: "TOO_MANY_REQUESTS", message: "The companion service is busy. Please wait a moment and try again." },
  ] as const;

  for (const scenario of scenarios) {
    it(`maps provider status ${scenario.status} to a product-safe error`, () => {
      try {
        providerFailure(new OhApiError("upstream detail that must not reach a user", scenario.status));
      } catch (error) {
        expect(error).toMatchObject({ code: scenario.code, message: scenario.message });
        expect(String((error as Error).message)).not.toContain("upstream detail");
      }
    });
  }

  it("maps a generic upstream failure to a product-safe service message", () => {
    try {
      providerFailure(new Error("raw provider stack trace"));
    } catch (error) {
      expect(error).toMatchObject({ code: "INTERNAL_SERVER_ERROR", message: "The companion service is temporarily unavailable." });
      expect(String((error as Error).message)).not.toContain("raw provider stack trace");
    }
  });
});
