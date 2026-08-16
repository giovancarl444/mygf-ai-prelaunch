import { ENV } from "./_core/env";

const OHAPI_BASE_URL = "https://api.oh.xyz";
const SAFE_GET_RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);

export class OhApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "OhApiError";
  }
}

export function getOhApiKey() {
  const key = ENV.ohapiApiKey.trim();
  if (!key) {
    throw new OhApiError("OhAPI is not configured. Add the server-side OHAPI_API_KEY before enabling companions.");
  }
  return key;
}

export function shouldRetrySafeOhApiGet(method: string, status: number) {
  return method === "GET" && SAFE_GET_RETRY_STATUSES.has(status);
}

/**
 * The documented payloads are flat, but several OhAPI responses wrap their
 * result in `data` / `result` / `response`. These readers accept either shape so
 * a wrapped body does not read as a missing field.
 */
function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

export function readString(value: unknown, keys: readonly string[]): string | undefined {
  const source = asRecord(value);
  for (const key of keys) {
    const found = source[key];
    if (typeof found === "string" && found.trim()) return found;
    if (typeof found === "number") return String(found);
  }
  for (const container of ["data", "result", "response", "job"]) {
    const nested = source[container];
    if (nested && typeof nested === "object") {
      const found = readString(nested, keys);
      if (found) return found;
    }
  }
  return undefined;
}

function readArray(value: unknown, keys: readonly string[]): unknown[] {
  if (Array.isArray(value)) return value;
  const source = asRecord(value);
  for (const key of keys) {
    if (Array.isArray(source[key])) return source[key] as unknown[];
  }
  for (const container of ["data", "result", "response"]) {
    const nested = source[container];
    if (nested && typeof nested === "object") {
      const found = readArray(nested, keys);
      if (found.length) return found;
    }
  }
  return [];
}

export async function ohApiFetch(path: string, init: RequestInit = {}) {
  const method = init.method?.toUpperCase() ?? "GET";
  const maxAttempts = method === "GET" ? 3 : 1;
  let response: Response | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      response = await fetch(`${OHAPI_BASE_URL}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": getOhApiKey(),
          ...init.headers,
        },
      });
      if (response.ok || !shouldRetrySafeOhApiGet(method, response.status) || attempt === maxAttempts) break;
      await new Promise(resolve => setTimeout(resolve, attempt * 400));
      continue;
    } catch {
      if (attempt < maxAttempts) await new Promise(resolve => setTimeout(resolve, attempt * 400));
    }
  }

  if (!response) {
    throw new OhApiError("OhAPI could not be reached after bounded retry attempts.", undefined);
  }

  if (!response.ok) {
    let detail = "";
    try {
      const body = await response.json() as { error?: string; message?: string; suggestion?: string };
      detail = body.message ?? body.error ?? "";
    } catch {
      // Preserve the status-specific error below when a provider body is not JSON.
    }
    throw new OhApiError(detail || `OhAPI request failed with status ${response.status}.`, response.status);
  }

  return response;
}

/* -------------------------------------------------------------------------- */
/* Characters                                                                  */
/* -------------------------------------------------------------------------- */

export type OhApiCharacter = {
  characterId: string;
  name: string;
  age: number | null;
  occupation: string | null;
  profileImageUrl: string | null;
  type: "ORIGINAL" | "DIGITAL_TWIN" | null;
};

/**
 * Normalizes one library entry.
 *
 * Verified against the live API on 14 August 2026. The published documentation
 * describes `character_id` / `name` / `profile_image_url`; the service actually
 * returns `characterId` (a number), `firstName`, `lastName`, and `sfwImage`,
 * and carries no age, occupation, or type. Both spellings are accepted so a
 * provider-side correction does not break the catalog.
 */
export function normalizeOhApiCharacter(raw: unknown, type: OhApiCharacter["type"] = null): OhApiCharacter | null {
  // The service returns a numeric id but requires a string on every request
  // that consumes one, so it is normalized to a string here, once.
  // `cid` and `profilePhotoUrl` are the spellings the provider's own OpenAPI
  // example uses; the live service currently answers with `characterId` and
  // `sfwImage`. Both are read so a correction upstream is not an outage here.
  const characterId = readString(raw, ["characterId", "character_id", "cid", "id"]);
  if (!characterId) return null;

  const source = asRecord(raw);
  const first = readString(raw, ["firstName", "first_name"]);
  const last = readString(raw, ["lastName", "last_name"]);
  const combined = [first, last].filter(Boolean).join(" ").trim();
  const fallbackName = readString(raw, ["name", "display_name", "character_name"]);

  const rawAge = source.age;
  const parsedAge = typeof rawAge === "number" ? rawAge : typeof rawAge === "string" ? Number.parseInt(rawAge, 10) : Number.NaN;
  const rawType = readString(raw, ["type", "character_type"])?.toUpperCase().replace(/[\s-]/g, "_");

  return {
    characterId,
    name: combined || fallbackName || "Unnamed companion",
    age: Number.isFinite(parsedAge) ? parsedAge : null,
    occupation: readString(raw, ["occupation", "job", "profession"]) ?? null,
    // Presigned and short lived — see listOhApiCharacters.
    profileImageUrl: readString(raw, ["sfwImage", "sfw_image", "profile_image_url", "profileImageUrl", "profilePhotoUrl", "image_url", "imageUrl", "image"]) ?? null,
    type: rawType === "ORIGINAL" || rawType === "DIGITAL_TWIN" ? rawType : type,
  };
}

/**
 * The provider's library for this partner account.
 *
 * `GET /api/v1/characters` is documented but does not exist — the live service
 * answers `403 Unknown endpoint`. `customer-library` is the real listing and
 * returns saved characters and digital twins together.
 *
 * Portrait URLs come back presigned with `X-Amz-Expires=3600`, so they are
 * valid for one hour and must be refreshed rather than stored as durable
 * references.
 */
export async function listOhApiCharacters(): Promise<OhApiCharacter[]> {
  const response = await ohApiFetch("/api/v1/customer-library", { method: "GET" });
  const body = await response.json() as unknown;
  const source = asRecord(body);

  const characters = readArray(source.characters ?? body, ["characters", "items", "results", "data"])
    .map(item => normalizeOhApiCharacter(item, "ORIGINAL"));
  const twins = readArray(source.digitalTwins ?? [], ["digitalTwins", "digital_twins", "items"])
    .map(item => normalizeOhApiCharacter(item, "DIGITAL_TWIN"));

  return [...characters, ...twins].filter((character): character is OhApiCharacter => character !== null);
}

export async function validateOhApiCredential() {
  const response = await ohApiFetch("/api/v1/customer-library", { method: "GET" });
  return response.json() as Promise<unknown>;
}

/**
 * Fresh portrait URLs keyed by character id.
 *
 * Cached briefly because every call mints new one-hour signatures, and the
 * public catalog must not issue a provider request per page view.
 */
const PORTRAIT_CACHE_TTL_MS = 40 * 60 * 1000;
let portraitCache: { at: number; urls: Map<string, string> } | null = null;

export async function getOhApiPortraits(now = Date.now()): Promise<Map<string, string>> {
  if (portraitCache && now - portraitCache.at < PORTRAIT_CACHE_TTL_MS) return portraitCache.urls;

  const characters = await listOhApiCharacters();
  const urls = new Map<string, string>();
  for (const character of characters) {
    if (character.profileImageUrl) urls.set(character.characterId, character.profileImageUrl);
  }
  portraitCache = { at: now, urls };
  return urls;
}

export function clearOhApiPortraitCache() {
  portraitCache = null;
}

/* -------------------------------------------------------------------------- */
/* Rooms and text                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Opens a conversation room.
 *
 * The documentation shows `{ character_id }` alone, which the live service
 * rejects: "user_id is required (or legacy user_gender)". `user_id` is the
 * current field, so the account's own identifier is passed to keep each
 * customer's context separate provider-side. `character_id` must be a string
 * even though the library returns it as a number.
 */
/**
 * The reply register a room answers in.
 *
 * `default` keeps the provider's production style. `short-form` is a brief,
 * punchy chat-speak register. `long-form` is a warm, natural one. It applies to
 * text and to voice notes, and can be changed later on the room.
 */
export type OhApiTextingStyle = "default" | "short-form" | "long-form";

export async function createOhApiRoom(input: {
  characterId: string;
  userId: string;
  textingStyle?: OhApiTextingStyle;
}) {
  // Room creation is the one call the whole conversation depends on, so the
  // request we have watched succeed is kept separable from the field we are
  // adding on the strength of the specification alone.
  const verified = {
    character_id: String(input.characterId),
    user_id: String(input.userId),
  };
  const withStyle = input.textingStyle && input.textingStyle !== "default"
    ? { ...verified, texting_style: input.textingStyle }
    : verified;

  const read = async (body: Record<string, unknown>) => {
    const response = await ohApiFetch("/api/v1/rooms", { method: "POST", body: JSON.stringify(body) });
    const roomId = readString(await response.json() as unknown, ["room_id", "roomId", "id"]);
    if (!roomId) throw new OhApiError("OhAPI did not return a room identifier.");
    return roomId;
  };

  try {
    return await read(withStyle);
  } catch (error) {
    if (withStyle === verified || !(error instanceof OhApiError) || error.status !== 400) throw error;
    console.warn("[OhAPI] Room creation rejected texting_style. Retrying without it.");
    return read(verified);
  }
}

/**
 * PATCH /api/v1/rooms/{room_id}/texting-style
 *
 * Applies from the next generated reply, for text and voice notes alike.
 */
export async function setOhApiRoomTextingStyle(input: { roomId: string; textingStyle: OhApiTextingStyle }) {
  await ohApiFetch(`/api/v1/rooms/${encodeURIComponent(input.roomId)}/texting-style`, {
    method: "PATCH",
    body: JSON.stringify({ texting_style: input.textingStyle }),
  });
}

/**
 * Sends one turn.
 *
 * Verified live: `{ room_id, character_id, message }` returns 200 with the
 * reply on `content`. The service also still accepts a legacy `{ room_id,
 * prompt }` body, so both spellings work; this sends the documented one.
 */
export async function generateOhApiText(input: { roomId: string; characterId: string; message: string }) {
  const response = await ohApiFetch("/api/v1/text", {
    method: "POST",
    body: JSON.stringify({
      room_id: input.roomId,
      character_id: String(input.characterId),
      message: input.message,
    }),
  });
  const body = await response.json() as unknown;
  // `content` is what the live service returns; the rest are defensive.
  const content = readString(body, ["content", "reply", "response", "message", "text", "output"]);
  if (!content) throw new OhApiError("OhAPI did not return text content.");

  // The response also carries `tool_call`. Asking the companion for a photo
  // produces a reply that ignores the request entirely, which suggests the
  // intent is expressed here rather than in the text. Its shape is not
  // documented, so it is captured verbatim for inspection rather than guessed at.
  const source = asRecord(body);
  const rawToolCall = source.tool_call ?? source.toolCall ?? null;

  return {
    content,
    toolCall: rawToolCall == null ? null : rawToolCall,
    messageId: readString(body, ["message_id", "messageId"]) ?? null,
  };
}

/* -------------------------------------------------------------------------- */
/* Asynchronous media                                                          */
/* -------------------------------------------------------------------------- */

export type OhApiJobSubmission = { jobId: string; presignedUrl: string | null };
export type OhApiJobState = {
  status: string;
  presignedUrl: string | null;
  errorMessage: string | null;
  /** A line the companion writes to accompany a finished generation. */
  followupText: string | null;
  /**
   * The prompt the provider actually generated from, which is a rewrite of the
   * one we sent. It is the only view we have of that rewrite, and the only way
   * to tell a prompt problem from a model problem when a result looks poor.
   */
  imagePrompt: string | null;
};

function readJobSubmission(body: unknown): OhApiJobSubmission {
  const jobId = readString(body, ["job_id", "jobId", "id"]);
  if (!jobId) throw new OhApiError("OhAPI did not return a job identifier.");
  return { jobId, presignedUrl: readString(body, ["presigned_url", "presignedUrl", "url"]) ?? null };
}

/**
 * Output shapes the provider documents, and the sizes the presets map to:
 * 9:16 → 720×1280, 16:9 → 1280×720, 1:1 → 1024×1024, 4:3 → 960×720,
 * 3:4 → 720×960. An explicit [width, height] array is also accepted —
 * verified live on 16 Aug 2026: `[1080, 1920]` returns true 1080×1920
 * output where every preset is capped at 1280 on its long edge. The cost in
 * provider credits per size is not published, which is why the product keeps
 * presets as the default and offers the explicit size deliberately.
 */
export type OhApiResolution = "9:16" | "16:9" | "1:1" | "4:3" | "3:4" | [number, number];

/** True when an explicit size is a shape the provider has been seen to honour. */
export function isExplicitResolution(resolution: OhApiResolution): resolution is [number, number] {
  return Array.isArray(resolution)
    && resolution.length === 2
    && resolution.every(side => Number.isInteger(side) && side >= 128 && side <= 2048);
}

/**
 * POST /api/v1/images
 *
 * Accepts `character_id` or, for the in-room flow, `room_id`. Both are sent when
 * a room exists so the generation carries the conversation's context; the
 * in-room flow is also what returns the companion's accompanying line.
 */
export async function requestOhApiImage(input: {
  characterId: string;
  roomId?: string;
  prompt: string;
  promptEnhancement?: boolean;
  resolution?: OhApiResolution;
  userGender?: "male" | "female";
}) {
  // The fields this service is known to accept, because we have watched it
  // accept them. Everything else is additive and can be dropped.
  const verified: Record<string, unknown> = { character_id: String(input.characterId), prompt: input.prompt };
  if (input.roomId) verified.room_id = input.roomId;

  const tuning: Record<string, unknown> = {};
  if (input.promptEnhancement !== undefined) tuning.prompt_enhancement = input.promptEnhancement;
  if (input.resolution) tuning.resolution = input.resolution;
  if (input.userGender) tuning.user_gender = input.userGender;

  try {
    const response = await ohApiFetch("/api/v1/images", {
      method: "POST",
      body: JSON.stringify({ ...verified, ...tuning }),
    });
    return readJobSubmission(await response.json() as unknown);
  } catch (error) {
    // The published documentation has been wrong about this service more than
    // once, and these fields are documented rather than observed. If the
    // service rejects the request for shape, fall back to the request we know
    // works: a customer waiting for a photo should not pay for our optimism.
    const rejected = error instanceof OhApiError && error.status === 400;
    if (!rejected || !Object.keys(tuning).length) throw error;

    console.warn(
      "[OhAPI] The image endpoint rejected the documented tuning fields (%s). Retrying without them.",
      Object.keys(tuning).join(", "),
    );
    const response = await ohApiFetch("/api/v1/images", { method: "POST", body: JSON.stringify(verified) });
    return readJobSubmission(await response.json() as unknown);
  }
}

/** POST /api/v1/videos/create — text-to-video or image-to-video. */
export async function requestOhApiVideo(input: {
  characterId?: string;
  imageUrl?: string;
  prompt: string;
  promptEnhancement?: boolean;
}) {
  const body: Record<string, unknown> = { prompt: input.prompt };
  if (input.characterId) body.character_id = String(input.characterId);
  if (input.imageUrl) body.image_url = input.imageUrl;
  if (input.promptEnhancement) body.prompt_enhancement = true;

  const response = await ohApiFetch("/api/v1/videos/create", { method: "POST", body: JSON.stringify(body) });
  return readJobSubmission(await response.json() as unknown);
}

/**
 * POST /api/v1/audio/notes
 *
 * The prose documentation's `/api/v1/audio` does not exist — it answers 403
 * "Unknown endpoint". This path does.
 *
 * **Audio is synchronous.** Unlike images and videos it answers 200 with the
 * finished `url` rather than 202 with a `job_id`, which is why the reference
 * marks images and videos "Async" and this one nothing. Both shapes are
 * accepted here: a job id is treated as a job, a bare url as already done.
 *
 * The specification names the text field `prompt` and requires `room_id`; the
 * field we have been sending is `text`. Both are sent, because this service
 * ignores fields it does not recognise and there is no key available to
 * determine which one it reads.
 */
export async function requestOhApiAudio(input: { characterId: string; roomId?: string; text: string }) {
  const body: Record<string, unknown> = {
    character_id: String(input.characterId),
    text: input.text,
    prompt: input.text,
  };
  if (input.roomId) body.room_id = input.roomId;

  const response = await ohApiFetch("/api/v1/audio/notes", { method: "POST", body: JSON.stringify(body) });
  const payload = await response.json() as unknown;

  const jobId = readString(payload, ["job_id", "jobId", "id"]) ?? null;
  const url = readString(payload, ["url", "presigned_url", "presignedUrl", "audio_url"]) ?? null;
  if (!jobId && !url) throw new OhApiError("OhAPI returned neither a job nor an audio URL.");

  return { jobId, presignedUrl: url };
}

/**
 * GET /api/v1/jobs/{job_id}/status
 *
 * Answers `{ job_id, status, url, results, error }`. Note that the result link
 * arrives as `url` here, while the submission response calls the same thing
 * `presigned_url`; both spellings are read.
 */
export async function getOhApiJobStatus(jobId: string): Promise<OhApiJobState> {
  const response = await ohApiFetch(`/api/v1/jobs/${encodeURIComponent(jobId)}/status`, { method: "GET" });
  const body = await response.json() as unknown;
  const results = asRecord(asRecord(body).results);

  return {
    status: (readString(body, ["status", "state", "job_status"]) ?? "unknown").toLowerCase(),
    presignedUrl: readString(body, ["url", "presigned_url", "presignedUrl", "result_url", "output_url"]) ?? null,
    errorMessage: readString(body, ["error", "error_message", "errorMessage", "failure_reason"]) ?? null,
    followupText: readString(results, ["followup_text", "followupText", "caption", "message"]) ?? null,
    imagePrompt: readString(results, ["image_prompt", "imagePrompt", "prompt", "revised_prompt"]) ?? null,
  };
}

const COMPLETED_JOB_STATUSES = new Set(["completed", "complete", "succeeded", "success", "done", "finished"]);
const FAILED_JOB_STATUSES = new Set(["failed", "error", "errored", "cancelled", "canceled", "rejected"]);

export function isCompletedOhApiJobStatus(status: string) {
  return COMPLETED_JOB_STATUSES.has(status);
}

export function isFailedOhApiJobStatus(status: string) {
  return FAILED_JOB_STATUSES.has(status);
}

/**
 * Classifies a polled job.
 *
 * Completion is decided by `status`, never by the presence of a presigned URL.
 * The submission response already returns a `presigned_url` before any work is
 * done, so treating a URL as proof of completion would report every job as
 * finished the moment it was queued.
 */
export function classifyOhApiJob(state: OhApiJobState): "completed" | "failed" | "pending" {
  if (isFailedOhApiJobStatus(state.status)) return "failed";
  if (isCompletedOhApiJobStatus(state.status)) return state.presignedUrl ? "completed" : "pending";
  return "pending";
}

/* -------------------------------------------------------------------------- */
/* Character generation lifecycle (owner-only, V2)                             */
/* -------------------------------------------------------------------------- */

export type OhApiDraftCharacterInput = {
  nationality: string;
  ethnicity: string;
  firstName: string;
  lastName: string;
  biography: string;
  gender: "Female" | "Male";
  dateOfBirth: string;
  job?: string;
  whereYouLive?: string;
};

export async function generateOhApiCharacterDraft(input: OhApiDraftCharacterInput) {
  const response = await ohApiFetch("/api/v2/characters/generate", {
    method: "POST",
    body: JSON.stringify(input),
  });
  const body = await response.json() as { characterGuid?: string; status?: string; message?: string };
  if (!body.characterGuid) throw new OhApiError("OhAPI did not return a draft character identifier.");
  return body;
}

export async function getOhApiCharacterDraftStatus(characterGuid: string) {
  const response = await ohApiFetch(`/api/v2/characters/${encodeURIComponent(characterGuid)}/status`, { method: "GET" });
  return response.json() as Promise<{ status?: string; characterId?: string; errorMessage?: string; [key: string]: unknown }>;
}

export async function getOhApiCharacterDraft(characterGuid: string) {
  const response = await ohApiFetch(`/api/v2/characters/${encodeURIComponent(characterGuid)}`, { method: "GET" });
  return response.json() as Promise<{ character?: Record<string, unknown>; generatedProfile?: Record<string, unknown>; [key: string]: unknown }>;
}

export async function saveOhApiCharacterDraft(characterGuid: string) {
  const response = await ohApiFetch("/api/v2/characters/save", {
    method: "POST",
    body: JSON.stringify({ characterGuid }),
  });
  return response.json() as Promise<{ characterGuid?: string; status?: string; message?: string; [key: string]: unknown }>;
}
