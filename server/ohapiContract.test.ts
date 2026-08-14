import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./_core/env", () => ({ ENV: { ohapiApiKey: "test-key" } }));

import {
  createOhApiRoom,
  generateOhApiText,
  getOhApiJobStatus,
  listOhApiCharacters,
  requestOhApiAudio,
  requestOhApiImage,
  requestOhApiVideo,
} from "./ohapi";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function respondWith(body: unknown, status = 200) {
  fetchMock.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);
}

function lastRequest() {
  const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
  return {
    url,
    method: init.method ?? "GET",
    headers: init.headers as Record<string, string>,
    body: init.body ? JSON.parse(init.body as string) : undefined,
  };
}

beforeEach(() => fetchMock.mockReset());

/**
 * These assertions encode the published OhAPI request contract. They exist
 * because the previous implementation posted `{ room_id, prompt }` to the text
 * endpoint, which the documentation does not define.
 */
describe("documented OhAPI request contract", () => {
  it("sends the partner key as X-API-Key on every request", async () => {
    respondWith({ characters: [] });
    await listOhApiCharacters();
    expect(lastRequest().headers["X-API-Key"]).toBe("test-key");
  });

  it("creates a room with only character_id", async () => {
    respondWith({ room_id: "room-1" });
    const roomId = await createOhApiRoom({ characterId: "char-1" });

    const request = lastRequest();
    expect(request.url).toBe("https://api.oh.xyz/api/v1/rooms");
    expect(request.method).toBe("POST");
    expect(request.body).toEqual({ character_id: "char-1" });
    expect(roomId).toBe("room-1");
  });

  it("sends chat as room_id, character_id and message", async () => {
    respondWith({ reply: "hello there" });
    const content = await generateOhApiText({ roomId: "room-1", characterId: "char-1", message: "hi" });

    const request = lastRequest();
    expect(request.url).toBe("https://api.oh.xyz/api/v1/text");
    expect(request.body).toEqual({ room_id: "room-1", character_id: "char-1", message: "hi" });
    expect(request.body).not.toHaveProperty("prompt");
    expect(content).toBe("hello there");
  });

  it("requests an image with character_id and prompt", async () => {
    respondWith({ job_id: "job-1", presigned_url: null });
    const job = await requestOhApiImage({ characterId: "char-1", prompt: "a portrait" });

    expect(lastRequest().url).toBe("https://api.oh.xyz/api/v1/images");
    expect(lastRequest().body).toEqual({ character_id: "char-1", prompt: "a portrait" });
    expect(job.jobId).toBe("job-1");
  });

  it("requests audio with character_id and text", async () => {
    respondWith({ job_id: "job-2" });
    await requestOhApiAudio({ characterId: "char-1", text: "say this" });

    expect(lastRequest().url).toBe("https://api.oh.xyz/api/v1/audio");
    expect(lastRequest().body).toEqual({ character_id: "char-1", text: "say this" });
  });

  it("supports both documented video modes without mixing their fields", async () => {
    respondWith({ job_id: "job-3" });
    await requestOhApiVideo({ characterId: "char-1", prompt: "a scene" });
    expect(lastRequest().url).toBe("https://api.oh.xyz/api/v1/videos/create");
    expect(lastRequest().body).toEqual({ prompt: "a scene", character_id: "char-1" });

    respondWith({ job_id: "job-4" });
    await requestOhApiVideo({ imageUrl: "https://example.test/a.jpg", prompt: "move", promptEnhancement: true });
    expect(lastRequest().body).toEqual({
      prompt: "move",
      image_url: "https://example.test/a.jpg",
      prompt_enhancement: true,
    });
  });

  it("polls job status on the documented path", async () => {
    respondWith({ status: "completed", presigned_url: "https://example.test/out.png" });
    const state = await getOhApiJobStatus("job-1");

    expect(lastRequest().url).toBe("https://api.oh.xyz/api/v1/jobs/job-1/status");
    expect(lastRequest().method).toBe("GET");
    expect(state).toEqual({ status: "completed", presignedUrl: "https://example.test/out.png", errorMessage: null });
  });
});

describe("provider response tolerance", () => {
  it("normalizes characters from a wrapped payload and snake or camel keys", async () => {
    respondWith({
      data: {
        characters: [
          { character_id: "c1", name: "Ada", age: "27", occupation: "Editor", profile_image_url: "https://x.test/a.jpg", type: "ORIGINAL" },
          { characterId: "c2", name: "Bea", age: 31, profileImageUrl: "https://x.test/b.jpg", type: "digital-twin" },
        ],
      },
    });

    const characters = await listOhApiCharacters();
    expect(characters).toEqual([
      { characterId: "c1", name: "Ada", age: 27, occupation: "Editor", profileImageUrl: "https://x.test/a.jpg", type: "ORIGINAL" },
      { characterId: "c2", name: "Bea", age: 31, occupation: null, profileImageUrl: "https://x.test/b.jpg", type: "DIGITAL_TWIN" },
    ]);
  });

  it("drops entries that carry no usable character id", async () => {
    respondWith({ characters: [{ name: "No id" }, { character_id: "c9", name: "Keeper" }] });
    const characters = await listOhApiCharacters();
    expect(characters.map(character => character.characterId)).toEqual(["c9"]);
  });

  it("falls back to a status-only message when an error body is unreadable", async () => {
    // 400 is not in the safe-retry set, so this is a single attempt.
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => { throw new Error("not json"); },
    } as unknown as Response);

    await expect(listOhApiCharacters()).rejects.toThrow("OhAPI request failed with status 400.");
  });

  it("retries a transient GET up to the bounded attempt limit before giving up", async () => {
    const transient = { ok: false, status: 503, json: async () => ({}) } as Response;
    fetchMock.mockResolvedValue(transient);

    await expect(listOhApiCharacters()).rejects.toThrow("OhAPI request failed with status 503.");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
