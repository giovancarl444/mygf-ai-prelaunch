import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  adultConfirmedAt: null as Date | null,
  publishedCompanions: [] as unknown[],
}));

vi.mock("./ohapiDb", async importOriginal => {
  const original = await importOriginal<typeof import("./ohapiDb")>();
  return {
    ...original,
    getUserAdultConfirmedAt: vi.fn(async () => mocks.adultConfirmedAt),
    listPublishedOhapiCharacters: vi.fn(async () => mocks.publishedCompanions),
  };
});

import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";
import { appRouter } from "./routers";

function anonymousContext(): TrpcContext {
  return { user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

function memberContext(): TrpcContext {
  return {
    user: { id: 7, openId: "member", role: "user" } as User,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

beforeEach(() => {
  mocks.adultConfirmedAt = null;
  mocks.publishedCompanions = [];
});

describe("anonymous access", () => {
  it("keeps every account-owned operation closed", async () => {
    const caller = appRouter.createCaller(anonymousContext());

    await expect(caller.chat.session()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.chat.history({ worldSlug: "someone" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.chat.send({ worldSlug: "someone", message: "hi" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.chat.confirmAdult()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.media.image({ worldSlug: "someone", prompt: "x" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.media.video({ worldSlug: "someone", prompt: "x" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.media.audio({ worldSlug: "someone", text: "x" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.media.jobStatus({ jobId: "job-1" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("still allows public discovery so the catalog renders signed out", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.companions.list()).resolves.toEqual([]);
  });
});

/**
 * The browser checkbox is presentation. These assertions cover the server-side
 * gate, so a crafted request cannot reach a generative endpoint by omitting it.
 */
describe("adult confirmation gate", () => {
  it("blocks generation for a signed-in account that has not confirmed", async () => {
    mocks.adultConfirmedAt = null;
    const caller = appRouter.createCaller(memberContext());

    await expect(caller.chat.send({ worldSlug: "someone", message: "hi" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.media.image({ worldSlug: "someone", prompt: "x" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.media.audio({ worldSlug: "someone", text: "x" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.media.video({ worldSlug: "someone", prompt: "x" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.media.jobStatus({ jobId: "job-1" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("stops blocking once the confirmation is recorded on the account", async () => {
    mocks.adultConfirmedAt = new Date("2026-08-14T00:00:00Z");
    const caller = appRouter.createCaller(memberContext());

    // The gate no longer rejects; the request now fails further in because the
    // companion does not exist, which is the next check rather than the gate.
    await expect(caller.chat.send({ worldSlug: "someone", message: "hi" }))
      .rejects.not.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("owner-only operations", () => {
  it("refuses studio access to a signed-in non-owner", async () => {
    const caller = appRouter.createCaller(memberContext());

    await expect(caller.ohapiStudio.health()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.ohapiStudio.syncCompanions()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.ohapiStudio.companions()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.ohapiStudio.generateDraft({
      firstName: "Test", lastName: "Person", nationality: "American", ethnicity: "Caucasian",
      biography: "A clearly adult fictional companion for authorization testing only.",
      gender: "Female", dateOfBirth: "1995-01-01",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
