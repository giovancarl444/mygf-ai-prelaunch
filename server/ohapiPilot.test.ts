import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

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
