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

export function normalizeOhApiCharacter(raw: unknown): OhApiCharacter | null {
  const characterId = readString(raw, ["character_id", "characterId", "id"]);
  if (!characterId) return null;

  const source = asRecord(raw);
  const rawAge = source.age ?? asRecord(source.data).age;
  const parsedAge = typeof rawAge === "number" ? rawAge : typeof rawAge === "string" ? Number.parseInt(rawAge, 10) : Number.NaN;
  const rawType = readString(raw, ["type", "character_type"])?.toUpperCase().replace(/[\s-]/g, "_");

  return {
    characterId,
    name: readString(raw, ["name", "display_name", "character_name", "first_name"]) ?? "Unnamed companion",
    age: Number.isFinite(parsedAge) ? parsedAge : null,
    occupation: readString(raw, ["occupation", "job", "profession"]) ?? null,
    profileImageUrl: readString(raw, ["profile_image_url", "profileImageUrl", "image_url", "imageUrl", "image", "avatar_url"]) ?? null,
    type: rawType === "ORIGINAL" || rawType === "DIGITAL_TWIN" ? rawType : null,
  };
}

/** GET /api/v1/characters — the provider's character library. */
export async function listOhApiCharacters(): Promise<OhApiCharacter[]> {
  const response = await ohApiFetch("/api/v1/characters", { method: "GET" });
  const body = await response.json() as unknown;
  return readArray(body, ["characters", "items", "results", "data"])
    .map(normalizeOhApiCharacter)
    .filter((character): character is OhApiCharacter => character !== null);
}

/** GET /api/v1/characters/customer-characters — saved characters only. */
export async function listOhApiCustomerCharacters(): Promise<OhApiCharacter[]> {
  const response = await ohApiFetch("/api/v1/characters/customer-characters", { method: "GET" });
  const body = await response.json() as unknown;
  return readArray(body, ["characters", "items", "results", "data"])
    .map(normalizeOhApiCharacter)
    .filter((character): character is OhApiCharacter => character !== null);
}

export async function validateOhApiCredential() {
  const response = await ohApiFetch("/api/v1/customer-library", { method: "GET" });
  return response.json() as Promise<unknown>;
}

/* -------------------------------------------------------------------------- */
/* Rooms and text                                                              */
/* -------------------------------------------------------------------------- */

/** POST /api/v1/rooms — documented body is `{ character_id }`. */
export async function createOhApiRoom(input: { characterId: string }) {
  const response = await ohApiFetch("/api/v1/rooms", {
    method: "POST",
    body: JSON.stringify({ character_id: input.characterId }),
  });
  const body = await response.json() as unknown;
  const roomId = readString(body, ["room_id", "roomId", "id"]);
  if (!roomId) throw new OhApiError("OhAPI did not return a room identifier.");
  return roomId;
}

/** POST /api/v1/text — documented body is `{ room_id, character_id, message }`. */
export async function generateOhApiText(input: { roomId: string; characterId: string; message: string }) {
  const response = await ohApiFetch("/api/v1/text", {
    method: "POST",
    body: JSON.stringify({
      room_id: input.roomId,
      character_id: input.characterId,
      message: input.message,
    }),
  });
  const body = await response.json() as unknown;
  const content = readString(body, ["reply", "response", "message", "text", "content", "output"]);
  if (!content) throw new OhApiError("OhAPI did not return text content.");
  return content;
}

/* -------------------------------------------------------------------------- */
/* Asynchronous media                                                          */
/* -------------------------------------------------------------------------- */

export type OhApiJobSubmission = { jobId: string; presignedUrl: string | null };
export type OhApiJobState = { status: string; presignedUrl: string | null; errorMessage: string | null };

function readJobSubmission(body: unknown): OhApiJobSubmission {
  const jobId = readString(body, ["job_id", "jobId", "id"]);
  if (!jobId) throw new OhApiError("OhAPI did not return a job identifier.");
  return { jobId, presignedUrl: readString(body, ["presigned_url", "presignedUrl", "url"]) ?? null };
}

/** POST /api/v1/images — `{ character_id, prompt }`. */
export async function requestOhApiImage(input: { characterId: string; prompt: string }) {
  const response = await ohApiFetch("/api/v1/images", {
    method: "POST",
    body: JSON.stringify({ character_id: input.characterId, prompt: input.prompt }),
  });
  return readJobSubmission(await response.json() as unknown);
}

/** POST /api/v1/videos/create — text-to-video or image-to-video. */
export async function requestOhApiVideo(input: {
  characterId?: string;
  imageUrl?: string;
  prompt: string;
  promptEnhancement?: boolean;
}) {
  const body: Record<string, unknown> = { prompt: input.prompt };
  if (input.characterId) body.character_id = input.characterId;
  if (input.imageUrl) body.image_url = input.imageUrl;
  if (input.promptEnhancement) body.prompt_enhancement = true;

  const response = await ohApiFetch("/api/v1/videos/create", { method: "POST", body: JSON.stringify(body) });
  return readJobSubmission(await response.json() as unknown);
}

/** POST /api/v1/audio — `{ character_id, text }`. */
export async function requestOhApiAudio(input: { characterId: string; text: string }) {
  const response = await ohApiFetch("/api/v1/audio", {
    method: "POST",
    body: JSON.stringify({ character_id: input.characterId, text: input.text }),
  });
  return readJobSubmission(await response.json() as unknown);
}

/** GET /api/v1/jobs/{job_id}/status */
export async function getOhApiJobStatus(jobId: string): Promise<OhApiJobState> {
  const response = await ohApiFetch(`/api/v1/jobs/${encodeURIComponent(jobId)}/status`, { method: "GET" });
  const body = await response.json() as unknown;
  return {
    status: (readString(body, ["status", "state", "job_status"]) ?? "unknown").toLowerCase(),
    presignedUrl: readString(body, ["presigned_url", "presignedUrl", "url", "result_url", "output_url"]) ?? null,
    errorMessage: readString(body, ["error", "error_message", "errorMessage", "failure_reason"]) ?? null,
  };
}

export function isTerminalOhApiJobStatus(status: string) {
  return status === "completed" || status === "complete" || status === "succeeded" || status === "failed" || status === "error";
}

export function isFailedOhApiJobStatus(status: string) {
  return status === "failed" || status === "error";
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
