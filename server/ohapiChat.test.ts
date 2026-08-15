import { beforeEach, describe, expect, it, vi } from "vitest";

const calls: string[] = [];

const state = vi.hoisted(() => ({
  adultConfirmedAt: new Date("2026-08-14T00:00:00Z") as Date | null,
  companion: { id: 11, providerCharacterId: "char-77", worldSlug: "ava-marchetti-4471", displayName: "Ava" } as Record<string, unknown> | undefined,
  existingRoom: undefined as Record<string, unknown> | undefined,
  allowanceUsed: 0,
  mediaAllowanceUsed: 0,
  roomsThisHour: 0,
  liveRooms: 0,
}));

const provider = vi.hoisted(() => ({
  createRoom: vi.fn(),
  generateText: vi.fn(),
  requestImage: vi.fn(),
  requestVideo: vi.fn(),
  requestAudio: vi.fn(),
}));

const store = vi.hoisted(() => ({
  createMessage: vi.fn(),
  createMediaJob: vi.fn(),
  refund: vi.fn(),
  dedupe: vi.fn(),
}));

vi.mock("./ohapi", async importOriginal => {
  const original = await importOriginal<typeof import("./ohapi")>();
  return {
    ...original,
    createOhApiRoom: provider.createRoom,
    generateOhApiText: provider.generateText,
    requestOhApiImage: provider.requestImage,
    requestOhApiVideo: provider.requestVideo,
    requestOhApiAudio: provider.requestAudio,
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
    consumeOhapiAllowance: vi.fn(async (_userId: number, scope: string, limit: number) => {
      calls.push(scope === "media" ? "consumeMediaAllowance" : "consumeAllowance");
      if (scope === "media") {
        state.mediaAllowanceUsed += 1;
        return original.describeOhapiAllowance(state.mediaAllowanceUsed, limit);
      }
      state.allowanceUsed += 1;
      return original.describeOhapiAllowance(state.allowanceUsed, limit);
    }),
    refundOhapiAllowance: store.refund,
    createOhapiMessage: store.createMessage,
    createOhapiMediaJob: store.createMediaJob,
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
  state.mediaAllowanceUsed = 0;
  state.roomsThisHour = 0;
  state.liveRooms = 0;
  provider.createRoom.mockReset().mockImplementation(async () => {
    calls.push("providerCreateRoom");
    return "room-abc";
  });
  provider.generateText.mockReset().mockImplementation(async () => {
    calls.push("providerGenerateText");
    return { content: "Hi — good to hear from you.", toolCall: null, messageId: null };
  });
  provider.requestImage.mockReset().mockImplementation(async () => {
    calls.push("providerRequestImage");
    return { jobId: "job-img-1", presignedUrl: null };
  });
  provider.requestVideo.mockReset().mockResolvedValue({ jobId: "job-vid-1", presignedUrl: null });
  provider.requestAudio.mockReset().mockResolvedValue({ jobId: "job-aud-1", presignedUrl: null });
  store.createMessage.mockReset();
  store.createMediaJob.mockReset().mockResolvedValue(undefined);
  store.refund.mockReset();
  store.dedupe.mockReset().mockResolvedValue({ kept: 501, retired: 0 });
});

describe("chat.send end to end", () => {
  it("opens a room and sends the message using the documented field names", async () => {
    const result = await memberCaller().chat.send({ worldSlug: "ava-marchetti-4471", message: "hey there" });

    expect(provider.createRoom).toHaveBeenCalledWith({
      characterId: "char-77",
      userId: "mygf-7",
      // Someone you are texting does not answer in paragraphs.
      textingStyle: "short-form",
    });
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

/**
 * Asking her for a photo is the whole interaction. It has to cost what the
 * generation panel costs, be owned the same way, and — above all — never take
 * the conversation down with it when it cannot be done.
 */
describe("media asked for in conversation", () => {
  it("starts a photo when the message asks for one, in the conversation's room", async () => {
    const result = await memberCaller().chat.send({
      worldSlug: "ava-marchetti-4471",
      message: "can you send me a picture?",
    });

    // Not the message. The message is how you ask; it is not a description of
    // a picture, and generating from it verbatim is our own quality problem.
    expect(provider.requestImage).toHaveBeenCalledWith(expect.objectContaining({
      characterId: "char-77",
      roomId: "room-abc",
      prompt: "A photo of Ava.",
    }));
    expect(result.media).toEqual({ jobId: "job-img-1", kind: "image" });
  });

  it("carries a description through to the provider when there was one", async () => {
    await memberCaller().chat.send({
      worldSlug: "ava-marchetti-4471",
      message: "can you send me a photo of you at the beach",
    });

    expect(provider.requestImage).toHaveBeenCalledWith(expect.objectContaining({
      prompt: "A photo of Ava at the beach.",
    }));
  });

  it("asks the provider to enhance the prompt and fixes the output shape", async () => {
    await memberCaller().chat.send({ worldSlug: "ava-marchetti-4471", message: "send me a pic" });

    expect(provider.requestImage).toHaveBeenCalledWith(expect.objectContaining({
      promptEnhancement: true,
      resolution: "9:16",
    }));
  });

  it("records the generation against the account and the room", async () => {
    await memberCaller().chat.send({ worldSlug: "ava-marchetti-4471", message: "send me a pic" });

    expect(store.createMediaJob).toHaveBeenCalledWith(expect.objectContaining({
      userId: 7,
      roomId: 501,
      ohapiCharacterId: 11,
      providerJobId: "job-img-1",
      kind: "image",
    }));
  });

  it("speaks the line she just wrote when asked for a voice note", async () => {
    await memberCaller().chat.send({ worldSlug: "ava-marchetti-4471", message: "send me a voice note" });

    expect(provider.requestAudio).toHaveBeenCalledWith({
      characterId: "char-77",
      roomId: "room-abc",
      text: "Hi — good to hear from you.",
    });
    expect(provider.requestImage).not.toHaveBeenCalled();
  });

  it("starts nothing for an ordinary message", async () => {
    const result = await memberCaller().chat.send({ worldSlug: "ava-marchetti-4471", message: "how was your day" });

    expect(provider.requestImage).not.toHaveBeenCalled();
    expect(provider.requestVideo).not.toHaveBeenCalled();
    expect(provider.requestAudio).not.toHaveBeenCalled();
    expect(result.media).toBeNull();
  });

  it("charges the generation allowance before the provider is asked", async () => {
    await memberCaller().chat.send({ worldSlug: "ava-marchetti-4471", message: "send me a photo" });

    expect(calls.indexOf("consumeMediaAllowance")).toBeGreaterThan(-1);
    expect(calls.indexOf("consumeMediaAllowance")).toBeLessThan(calls.indexOf("providerRequestImage"));
  });

  /** The reply is already written and paid for; losing it would be the worse bug. */
  it("still delivers the reply when the generation allowance is spent", async () => {
    state.mediaAllowanceUsed = 999;
    const result = await memberCaller().chat.send({
      worldSlug: "ava-marchetti-4471",
      message: "send me a photo",
    });

    expect(result.content).toBe("Hi — good to hear from you.");
    expect(result.media).toBeNull();
    expect(provider.requestImage).not.toHaveBeenCalled();
  });

  it("still delivers the reply when the provider refuses the generation", async () => {
    const { OhApiError } = await import("./ohapi");
    provider.requestImage.mockRejectedValueOnce(new OhApiError("upstream exploded", 500));

    const result = await memberCaller().chat.send({
      worldSlug: "ava-marchetti-4471",
      message: "send me a photo",
    });

    expect(result.content).toBe("Hi — good to hear from you.");
    expect(result.media).toBeNull();
  });

  /**
   * Saying nothing reads as the request never landing. She was asked for a
   * photo and could not send one, and the thread has to show that — otherwise
   * an exhausted credit balance looks identical to her ignoring you.
   */
  it("records a failed entry when the generation never started", async () => {
    const { OhApiError } = await import("./ohapi");
    provider.requestImage.mockRejectedValueOnce(new OhApiError("no credit", 403));

    await memberCaller().chat.send({ worldSlug: "ava-marchetti-4471", message: "send me a photo" });

    expect(store.createMediaJob).toHaveBeenCalledWith(expect.objectContaining({
      userId: 7,
      roomId: 501,
      kind: "image",
      status: "failed",
    }));
  });

  it("does the same when the generation allowance is spent", async () => {
    state.mediaAllowanceUsed = 999;
    await memberCaller().chat.send({ worldSlug: "ava-marchetti-4471", message: "send me a photo" });

    expect(store.createMediaJob).toHaveBeenCalledWith(expect.objectContaining({ status: "failed" }));
  });

  /**
   * An exhausted credit balance is our billing state, not a bad request. The
   * customer received nothing, so the attempt goes back.
   */
  it("returns the generation attempt when the provider refuses on credit", async () => {
    const { OhApiError } = await import("./ohapi");
    provider.requestImage.mockRejectedValueOnce(new OhApiError("insufficient credit", 403));

    await memberCaller().chat.send({ worldSlug: "ava-marchetti-4471", message: "send me a photo" });
    expect(store.refund).toHaveBeenCalledWith(7, "media");
  });

  it("keeps the attempt when the provider rejects the prompt on moderation", async () => {
    const { OhApiError } = await import("./ohapi");
    provider.requestImage.mockRejectedValueOnce(new OhApiError("moderation", 400));

    await memberCaller().chat.send({ worldSlug: "ava-marchetti-4471", message: "send me a photo" });
    expect(store.refund).not.toHaveBeenCalledWith(7, "media");
  });
});

/**
 * The interruption has to happen before the money and before the provider.
 * Charging someone for the moment they disclosed self-harm, or generating a
 * flirty reply to it, are both unacceptable outcomes and both are prevented by
 * where this check sits rather than by what it says.
 */
describe("the safety protocol", () => {
  it("never sends a crisis message to the provider", async () => {
    await memberCaller().chat.send({
      worldSlug: "ava-marchetti-4471",
      message: "i don't want to be alive anymore",
    });

    expect(provider.generateText).not.toHaveBeenCalled();
    expect(provider.createRoom).not.toHaveBeenCalled();
    expect(provider.requestImage).not.toHaveBeenCalled();
  });

  it("does not charge for it", async () => {
    await memberCaller().chat.send({
      worldSlug: "ava-marchetti-4471",
      message: "i want to kill myself",
    });

    expect(calls).not.toContain("consumeAllowance");
    expect(calls).not.toContain("consumeMediaAllowance");
  });

  it("answers as the product, not as the companion", async () => {
    const result = await memberCaller().chat.send({
      worldSlug: "ava-marchetti-4471",
      message: "i want to kill myself",
    });

    expect(result.crisis).toBe(true);
    expect(result.content).toContain("not your companion");
    expect(result.content).toContain("988");
    expect(result.resources).toBeTruthy();
  });

  /**
   * A request for a photo in the same breath must not be honoured. Nothing
   * about that message is a normal request.
   */
  it("starts no generation even when the message also asks for one", async () => {
    await memberCaller().chat.send({
      worldSlug: "ava-marchetti-4471",
      message: "send me a photo before i kill myself",
    });

    expect(provider.requestImage).not.toHaveBeenCalled();
    expect(store.createMediaJob).not.toHaveBeenCalled();
  });

  it("keeps the exchange in the thread when a conversation already exists", async () => {
    state.existingRoom = { id: 501, providerRoomId: "room-abc", ohapiCharacterId: 11 };
    await memberCaller().chat.send({
      worldSlug: "ava-marchetti-4471",
      message: "i have been cutting myself",
    });

    expect(store.createMessage).toHaveBeenNthCalledWith(1, {
      roomId: 501,
      role: "user",
      content: "i have been cutting myself",
    });
    expect(store.createMessage).toHaveBeenNthCalledWith(2, expect.objectContaining({
      roomId: 501,
      role: "assistant",
    }));
  });

  it("opens no room for someone who has never spoken to her", async () => {
    state.existingRoom = undefined;
    const result = await memberCaller().chat.send({
      worldSlug: "ava-marchetti-4471",
      message: "i want to die",
    });

    expect(provider.createRoom).not.toHaveBeenCalled();
    expect(store.createMessage).not.toHaveBeenCalled();
    expect(result.crisis).toBe(true);
  });

  it("leaves ordinary conversation alone", async () => {
    const result = await memberCaller().chat.send({
      worldSlug: "ava-marchetti-4471",
      message: "this week is killing me but i'm dying to see you",
    });

    expect(result.crisis).toBe(false);
    expect(provider.generateText).toHaveBeenCalled();
  });
});
