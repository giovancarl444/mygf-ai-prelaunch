import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

/**
 * The collection router's decisions — who may save, what may be saved, and
 * that toggle is a real toggle — with the data layer mocked to a tiny
 * in-memory map. The drizzle queries themselves are covered by the typecheck.
 */
const store = vi.hoisted(() => ({
  characters: new Map<string, { id: number; visibility: "published" | "hidden" }>(),
  saved: new Set<string>(),
}));

vi.mock("./ohapiDb", () => ({
  getOhapiCharacterBySlug: async (worldSlug: string) => {
    const character = store.characters.get(worldSlug);
    return character ? { id: character.id, visibility: character.visibility, worldSlug } : undefined;
  },
  isOhapiCharacterSavedByUser: async (userId: number, characterId: number) =>
    store.saved.has(`${userId}:${characterId}`),
  saveOhapiCharacterForUser: async (userId: number, characterId: number) => {
    store.saved.add(`${userId}:${characterId}`);
  },
  unsaveOhapiCharacterForUser: async (userId: number, characterId: number) => {
    store.saved.delete(`${userId}:${characterId}`);
  },
  listSavedOhapiCharacterSlugs: async () => [],
}));

import { appRouter } from "./routers";

const member = {
  id: 7, openId: "member", email: "m@example.com", name: "Member",
  loginMethod: "manus", role: "user" as const,
  createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
};
const guest = { ...member, id: 42, openId: "guest:abc" };

function callerFor(user: typeof member) {
  return appRouter.createCaller({
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  });
}

beforeEach(() => {
  store.characters.clear();
  store.saved.clear();
  store.characters.set("juliana", { id: 1, visibility: "published" });
  store.characters.set("retired-heroine", { id: 2, visibility: "hidden" });
});

describe("collection", () => {
  it("saves a published companion for a member, then unsaves it", async () => {
    const caller = callerFor(member);

    expect(await caller.collection.toggle({ worldSlug: "juliana" })).toEqual({ saved: true });
    expect(store.saved.has("7:1")).toBe(true);

    expect(await caller.collection.toggle({ worldSlug: "juliana" })).toEqual({ saved: false });
    expect(store.saved.has("7:1")).toBe(false);
  });

  it("tells a guest to create an account instead of saving", async () => {
    const caller = callerFor(guest);
    await expect(caller.collection.toggle({ worldSlug: "juliana" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(store.saved.size).toBe(0);
  });

  it("refuses to save a companion that does not exist", async () => {
    const caller = callerFor(member);
    await expect(caller.collection.toggle({ worldSlug: "nobody" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("will not newly save a hidden companion, but will let an old save go", async () => {
    const caller = callerFor(member);
    store.saved.add("7:2");

    expect(await caller.collection.toggle({ worldSlug: "retired-heroine" })).toEqual({ saved: false });
    store.saved.add("7:2");

    store.saved.delete("7:2");
    await expect(caller.collection.toggle({ worldSlug: "retired-heroine" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
