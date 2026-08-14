import { beforeEach, describe, expect, it, vi } from "vitest";

const calls: string[] = [];

const state = vi.hoisted(() => ({
  adultConfirmedAt: new Date("2026-08-14T00:00:00Z") as Date | null,
  companion: { id: 11, providerCharacterId: "char-77", worldSlug: "ava-marchetti-4471", displayName: "Ava" } as Record<string, unknown> | undefined,
  existingRoom: undefined as Record<string, unknown> | undefined,
  allowanceUsed: 0,
  roomsThisHour: 0,
  liveRooms: 0,
}));

const provider = vi.hoisted(() => ({
  createRoom: vi.fn(),
  generateText: vi.fn(),
}));

const store = vi.hoisted(() => ({
  createMessage: vi.fn(),
  refund: vi.fn(),
  dedupe: vi.fn(),
}));

vi.mock("./ohapi", async importOriginal => {
  const original = await importOriginal<typeof import("./ohapi")>();
  return {
    ...original,
    createOhApiRoom: provider.createRoom,
    generateOhApiText: provider.generateText,
  };
});

vi.mock("./ohapiDb", async importOriginal => {
  const original = await importOriginal<typeof import("./ohapiDb")>();
  return {
    ...original,
    getUserAdultConfirmedAt: vi.fn(async () => state.adultConfirmedAt),
    getChattableOhapiCharacter: vi.fn(async () => state.companion),
    getOwnedOhapiRoom: vi.fn(async () => state.existingRoom),
    countLiveOhapiRooms: vi.fn(async () => state.liveRooms),
    countOhapiRoomsCreatedThisHour: vi.fn(async () => state.roomsThisHour),
    createOwnedOhapiRoom: vi.fn(async () => {
      calls.push("createLocalRoom");
      state.existingRoom = { id: 501, providerRoomId: "room-abc", ohapiCharacterId: 11 };
      return state.existingRoom;
    }),
    dedupeOwnedOhapiRooms: store.dedupe,
    consumeOhapiAllowance: vi.fn(async (_userId: number, _scope: string, limit: number) => {
      calls.push("consumeAllowance");
      state.allowanceUsed += 1;
      return original.describeOhapiAllowance(state.allowanceUsed, limit);
    }),
    refundOhapiAllowance: store.refund,
    createOhapiMessage: store.createMessage,
    touchOhapiRoom: vi.fn(async () => {}),
  };
});

import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";
import { appRouter } from "./routers";

function memberCaller() {
  const ctx: TrpcContext = {
    user: { id: 7, openId: "member", role: "user" } as User,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
  return appRouter.createCaller(ctx);
}

beforeEach(() => {
  calls.length = 0;
  state.adultConfirmedAt = new Date("2026-08-14T00:00:00Z");
  state.companion = { id: 11, providerCharacterId: "char-77", worldSlug: "ava-marchetti-4471", displayName: "Ava" };
  state.existingRoom = undefined;
  state.allowanceUsed = 0;
  state.roomsThisHour = 0;
  state.liveRooms = 0;
  provider.createRoom.mockReset().mockImplementation(async () => {
    calls.push("providerCreateRoom");
    return "room-abc";
  });
  provider.generateText.mockReset().mockImplementation(async () => {
    calls.push("providerGenerateText");
    return "Hi — good to hear from you.";
  });
  store.createMessage.mockReset();
  store.refund.mockReset();
  store.dedupe.mockReset().mockResolvedValue({ kept: 501, retired: 0 });
});

describe("chat.send end to end", () => {
  it("opens a room and sends the message using the documented field names", async () => {
    const result = await memberCaller().chat.send({ worldSlug: "ava-marchetti-4471", message: "hey there" });

    expect(provider.createRoom).toHaveBeenCalledWith({ characterId: "char-77", userId: "mygf-7" });
    expect(provider.generateText).toHaveBeenCalledWith({
      roomId: "room-abc",
      characterId: "char-77",
      message: "hey there",
    });
    expect(result.content).toBe("Hi — good to hear from you.");
  });

  it("persists the customer message and the reply against the room", async () => {
    await memberCaller().chat.send({ worldSlug: "ava-marchetti-4471", message: "hey there" });

    expect(store.createMessage).toHaveBeenNthCalledWith(1, { roomId: 501, role: "user", content: "hey there" });
    expect(store.createMessage).toHaveBeenNthCalledWith(2, {
      roomId: 501,
      role: "assistant",
      content: "Hi — good to hear from you.",
    });
  });

  /**
   * The ordering is the fix for the original unbounded-room defect: an account
   * over its limit must be rejected before anything exists provider-side.
   */
  it("charges the allowance before creating anything provider-side", async () => {
    await memberCaller().chat.send({ worldSlug: "ava-marchetti-4471", message: "hey there" });

    expect(calls.indexOf("consumeAllowance")).toBeLessThan(calls.indexOf("providerCreateRoom"));
    expect(calls.indexOf("providerCreateRoom")).toBeLessThan(calls.indexOf("providerGenerateText"));
  });

  it("creates no provider room once the hourly message allowance is spent", async () => {
    state.allowanceUsed = 999;
    await expect(memberCaller().chat.send({ worldSlug: "ava-marchetti-4471", message: "hey" }))
      .rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });

    expect(provider.createRoom).not.toHaveBeenCalled();
    expect(provider.generateText).not.toHaveBeenCalled();
  });

  it("creates no provider room once the hourly room allowance is spent, and refunds the message", async () => {
    state.roomsThisHour = 99;
    await expect(memberCaller().chat.send({ worldSlug: "ava-marchetti-4471", message: "hey" }))
      .rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });

    expect(provider.createRoom).not.toHaveBeenCalled();
    expect(store.refund).toHaveBeenCalled();
  });

  it("reuses the existing room instead of opening a second one", async () => {
    state.existingRoom = { id: 501, providerRoomId: "room-abc", ohapiCharacterId: 11 };
    await memberCaller().chat.send({ worldSlug: "ava-marchetti-4471", message: "again" });

    expect(provider.createRoom).not.toHaveBeenCalled();
    expect(provider.generateText).toHaveBeenCalledWith(expect.objectContaining({ roomId: "room-abc" }));
  });

  it("collapses duplicate rooms after opening one", async () => {
    await memberCaller().chat.send({ worldSlug: "ava-marchetti-4471", message: "hey" });
    expect(store.dedupe).toHaveBeenCalledWith({ userId: 7, ohapiCharacterId: 11 });
  });

  it("refuses an unpublished companion without touching the provider", async () => {
    state.companion = undefined;
    await expect(memberCaller().chat.send({ worldSlug: "not-published", message: "hey" }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });

    expect(provider.createRoom).not.toHaveBeenCalled();
  });

  it("refunds the message when the provider fails on infrastructure", async () => {
    const { OhApiError } = await import("./ohapi");
    provider.generateText.mockRejectedValueOnce(new OhApiError("upstream exploded", 500));

    await expect(memberCaller().chat.send({ worldSlug: "ava-marchetti-4471", message: "hey" }))
      .rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    expect(store.refund).toHaveBeenCalled();
  });

  it("keeps the charge when the provider rejects the prompt on moderation", async () => {
    const { OhApiError } = await import("./ohapi");
    provider.generateText.mockRejectedValueOnce(new OhApiError("moderation", 400));

    await expect(memberCaller().chat.send({ worldSlug: "ava-marchetti-4471", message: "hey" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(store.refund).not.toHaveBeenCalled();
  });

  it("never leaks provider error text to the customer", async () => {
    const { OhApiError } = await import("./ohapi");
    provider.generateText.mockRejectedValueOnce(new OhApiError("internal trace: key=sk-live-abc123", 500));

    await expect(memberCaller().chat.send({ worldSlug: "ava-marchetti-4471", message: "hey" }))
      .rejects.toThrow(/temporarily unavailable/);
  });
});
