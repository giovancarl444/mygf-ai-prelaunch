import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { summarizeOhApiLibrary } from "./ohapiStudio";

function createAnonymousContext(): TrpcContext {
  return { user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("OhAPI Studio authorization", () => {
  it("does not expose the Studio health or provider library to anonymous callers", async () => {
    const caller = appRouter.createCaller(createAnonymousContext());
    await expect(caller.ohapiStudio.health()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.ohapiStudio.refreshLibrary()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("OhAPI Studio provider summaries", () => {
  it("returns only top-level section counts and omits raw provider records", () => {
    expect(summarizeOhApiLibrary({ characters: [{ id: "secret-provider-id" }, { id: "another-id" }], digitalTwins: [{ id: "twin-id" }], ignored: "text" })).toEqual([
      { section: "characters", count: 2 },
      { section: "digitalTwins", count: 1 },
    ]);
  });
});
