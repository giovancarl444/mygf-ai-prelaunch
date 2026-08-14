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
 * These assertions encode the contract as the live service actually behaves,
 * verified against api.oh.xyz on 14 August 2026. They differ from the published
 * documentation in three places, each of which is called out below.
 */
describe("verified OhAPI request contract", () => {
  it("sends the partner key as X-API-Key on every request", async () => {
    respondWith({ characters: [] });
    await listOhApiCharacters();
    expect(lastRequest().headers["X-API-Key"]).toBe("test-key");
  });

  /**
   * The documented `GET /api/v1/characters` does not exist — the live service
   * answers 403 "Unknown endpoint". customer-library is the real listing.
   */
  it("reads the library from customer-library, not the documented characters path", async () => {
    respondWith({ success: true, characters: [], digitalTwins: [] });
    await listOhApiCharacters();

    expect(lastRequest().url).toBe("https://api.oh.xyz/api/v1/customer-library");
    expect(lastRequest().url).not.toContain("/api/v1/characters");
  });

  /**
   * Documented as `{ character_id }` alone, which the live service rejects with
   * "user_id is required (or legacy user_gender)". character_id must also be a
   * string even though the library returns it as a number.
   */
  it("creates a room with a string character_id and a user_id", async () => {
    respondWith({ room_id: "room-1" });
    const roomId = await createOhApiRoom({ characterId: "21555", userId: "mygf-7" });

    const request = lastRequest();
    expect(request.url).toBe("https://api.oh.xyz/api/v1/rooms");
    expect(request.method).toBe("POST");
    expect(request.body).toEqual({ character_id: "21555", user_id: "mygf-7" });
    expect(typeof request.body.character_id).toBe("string");
    expect(roomId).toBe("room-1");
  });

  it("sends chat as room_id, character_id and message, and reads content", async () => {
    respondWith({ content: "hello there", job_id: "j1", message_id: "m1" });
    const reply = await generateOhApiText({ roomId: "room-1", characterId: "21555", message: "hi" });

    const request = lastRequest();
    expect(request.url).toBe("https://api.oh.xyz/api/v1/text");
    expect(request.body).toEqual({ room_id: "room-1", character_id: "21555", message: "hi" });
    expect(reply.content).toBe("hello there");
    expect(reply.messageId).toBe("m1");
  });

  /**
   * The reply to "send me a photo of you" ignores the request entirely, so the
   * intent is expressed somewhere other than `content`. `tool_call` is captured
   * verbatim rather than interpreted, because its shape is undocumented.
   */
  it("captures tool_call without interpreting it", async () => {
    const toolCall = { name: "send_image", arguments: { style: "selfie" } };
    respondWith({ content: "sure, one sec", tool_call: toolCall, message_id: "m2" });
    const reply = await generateOhApiText({ roomId: "room-1", characterId: "21555", message: "send me a photo" });
    expect(reply.toolCall).toEqual(toolCall);
  });

  it("reports no tool_call when the provider omits it", async () => {
    respondWith({ content: "just talking", message_id: "m3" });
    const reply = await generateOhApiText({ roomId: "room-1", characterId: "21555", message: "hi" });
    expect(reply.toolCall).toBeNull();
  });

  it("requests an image with character_id and prompt", async () => {
    respondWith({ job_id: "job-1", presigned_url: null });
    const job = await requestOhApiImage({ characterId: "char-1", prompt: "a portrait" });

    expect(lastRequest().url).toBe("https://api.oh.xyz/api/v1/images");
    expect(lastRequest().body).toEqual({ character_id: "char-1", prompt: "a portrait" });
    expect(job.jobId).toBe("job-1");
  });

  /**
   * Documented quality controls. `prompt_enhancement` has the provider expand
   * the prompt with its own model, and `resolution` fixes the output shape
   * rather than leaving it to an unknown default.
   */
  it("sends the documented quality fields when they are asked for", async () => {
    respondWith({ job_id: "job-q" });
    await requestOhApiImage({
      characterId: "char-1",
      roomId: "room-9",
      prompt: "a portrait",
      promptEnhancement: true,
      resolution: "9:16",
      userGender: "male",
    });

    expect(lastRequest().body).toEqual({
      character_id: "char-1",
      room_id: "room-9",
      prompt: "a portrait",
      prompt_enhancement: true,
      resolution: "9:16",
      user_gender: "male",
    });
  });

  /**
   * These fields are documented rather than observed, and this documentation
   * has been wrong before. A rejection on shape must not cost the customer the
   * photo they asked for.
   */
  it("retries without the tuning fields if the service rejects them", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: "unexpected field" }),
    } as unknown as Response);
    respondWith({ job_id: "job-fallback" });

    const job = await requestOhApiImage({
      characterId: "char-1",
      prompt: "a portrait",
      promptEnhancement: true,
      resolution: "9:16",
    });

    expect(job.jobId).toBe("job-fallback");
    expect(lastRequest().body).toEqual({ character_id: "char-1", prompt: "a portrait" });
  });

  it("does not retry when the request carried no tuning to drop", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: "moderation" }),
    } as unknown as Response);

    await expect(requestOhApiImage({ characterId: "char-1", prompt: "a portrait" })).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  /**
   * The prose documentation's `/api/v1/audio` does not exist — it answers 403
   * "Unknown endpoint". `/api/v1/audio/notes` is the real path, and it is also
   * the path the OpenAPI specification gives.
   *
   * The specification names the spoken text `prompt`; we have been sending
   * `text`. Both go, because there is no key available to determine which one
   * the service reads and it ignores fields it does not recognise.
   */
  it("requests audio on the notes path, under both spellings of the text", async () => {
    respondWith({ job_id: "job-2" });
    await requestOhApiAudio({ characterId: "char-1", text: "say this" });

    expect(lastRequest().url).toBe("https://api.oh.xyz/api/v1/audio/notes");
    expect(lastRequest().body).toEqual({ character_id: "char-1", text: "say this", prompt: "say this" });
  });

  /**
   * Audio is synchronous. It answers 200 with the finished file rather than
   * 202 with a job id, which is why the reference marks images and videos
   * "Async" and this one nothing. Demanding a job id here rejected every
   * successful voice note.
   */
  it("accepts a finished audio URL with no job id", async () => {
    respondWith({ url: "https://example.test/note.mp3" });
    const result = await requestOhApiAudio({ characterId: "char-1", roomId: "room-9", text: "say this" });

    expect(result.jobId).toBeNull();
    expect(result.presignedUrl).toBe("https://example.test/note.mp3");
  });

  it("still accepts a job id if the provider ever makes audio asynchronous", async () => {
    respondWith({ job_id: "job-async" });
    const result = await requestOhApiAudio({ characterId: "char-1", text: "say this" });
    expect(result.jobId).toBe("job-async");
  });

  it("refuses a response carrying neither a job nor a file", async () => {
    respondWith({ message: "ok" });
    await expect(requestOhApiAudio({ characterId: "char-1", text: "say this" })).rejects.toThrow(/neither a job nor an audio URL/);
  });

  it("uses the in-room flow for image and audio when a room exists", async () => {
    respondWith({ job_id: "job-5" });
    await requestOhApiImage({ characterId: "char-1", roomId: "room-9", prompt: "a portrait" });
    expect(lastRequest().body).toEqual({ character_id: "char-1", room_id: "room-9", prompt: "a portrait" });

    respondWith({ job_id: "job-6" });
    await requestOhApiAudio({ characterId: "char-1", roomId: "room-9", text: "say this" });
    expect(lastRequest().body).toEqual({
      character_id: "char-1",
      room_id: "room-9",
      text: "say this",
      prompt: "say this",
    });
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

  /**
   * The live status endpoint answers `{ job_id, status, url, results, error }`.
   * It calls the result link `url`, while the submission response calls the same
   * thing `presigned_url`, and it carries the companion's accompanying line on
   * `results.followup_text`.
   */
  it("reads the live job-status shape, including the followup line", async () => {
    respondWith({
      job_id: "job-1",
      status: "completed",
      url: "https://example.test/out.png",
      results: { image_prompt: null, detected_level: 1, followup_text: "Thinking of you." },
      error: null,
    });
    const state = await getOhApiJobStatus("job-1");

    expect(lastRequest().url).toBe("https://api.oh.xyz/api/v1/jobs/job-1/status");
    expect(lastRequest().method).toBe("GET");
    expect(state).toEqual({
      status: "completed",
      presignedUrl: "https://example.test/out.png",
      errorMessage: null,
      followupText: "Thinking of you.",
      imagePrompt: null,
    });
  });

  /**
   * The provider rewrites the prompt before generating and reports the rewrite
   * on `results.image_prompt`. Reading it is what makes a poor result
   * diagnosable rather than a guess.
   */
  it("reads back the prompt the provider actually generated from", async () => {
    respondWith({
      status: "completed",
      url: "https://example.test/out.png",
      results: { image_prompt: "A photo of Sienna, golden hour, 85mm", detected_level: 2 },
    });
    const state = await getOhApiJobStatus("job-1");
    expect(state.imagePrompt).toBe("A photo of Sienna, golden hour, 85mm");
  });

  it("still reads presigned_url when the status endpoint uses that spelling", async () => {
    respondWith({ status: "completed", presigned_url: "https://example.test/out.png" });
    const state = await getOhApiJobStatus("job-1");
    expect(state.presignedUrl).toBe("https://example.test/out.png");
    expect(state.followupText).toBeNull();
  });
});

describe("provider response tolerance", () => {
  /**
   * The real payload shape, copied from a live customer-library response: a
   * numeric characterId, split first and last names, an sfwImage portrait, and
   * no age, occupation, or type at all.
   */
  it("normalizes the live customer-library shape", async () => {
    respondWith({
      success: true,
      characters: [{ characterId: 21555, firstName: "Sienna", lastName: "Vale", sfwImage: "https://s3.test/sfw.png?X-Amz-Expires=3600" }],
      digitalTwins: [],
    });

    expect(await listOhApiCharacters()).toEqual([{
      characterId: "21555",
      name: "Sienna Vale",
      age: null,
      occupation: null,
      profileImageUrl: "https://s3.test/sfw.png?X-Amz-Expires=3600",
      type: "ORIGINAL",
    }]);
  });

  it("coerces the numeric character id to the string every request needs", async () => {
    respondWith({ characters: [{ characterId: 21555, firstName: "Sienna", lastName: "Vale" }], digitalTwins: [] });
    const [character] = await listOhApiCharacters();
    expect(character.characterId).toBe("21555");
    expect(typeof character.characterId).toBe("string");
  });

  it("labels digital twins from the array they arrive in", async () => {
    respondWith({
      characters: [{ characterId: 1, firstName: "Ada", lastName: "Lovelace" }],
      digitalTwins: [{ characterId: 2, firstName: "Bea", lastName: "Twin" }],
    });

    const characters = await listOhApiCharacters();
    expect(characters.map(c => [c.name, c.type])).toEqual([["Ada Lovelace", "ORIGINAL"], ["Bea Twin", "DIGITAL_TWIN"]]);
  });

  it("still accepts the documented spellings in case the provider corrects them", async () => {
    respondWith({ characters: [{ character_id: "c1", name: "Ada", age: "27", occupation: "Editor", profile_image_url: "https://x.test/a.jpg" }] });
    expect(await listOhApiCharacters()).toEqual([{
      characterId: "c1", name: "Ada", age: 27, occupation: "Editor", profileImageUrl: "https://x.test/a.jpg", type: "ORIGINAL",
    }]);
  });

  it("drops entries that carry no usable character id", async () => {
    respondWith({ characters: [{ firstName: "No id" }, { characterId: 9, firstName: "Keeper", lastName: "Kept" }] });
    const characters = await listOhApiCharacters();
    expect(characters.map(character => character.characterId)).toEqual(["9"]);
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
