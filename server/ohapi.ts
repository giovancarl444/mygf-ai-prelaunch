import { ENV } from "./_core/env";

const OHAPI_BASE_URL = "https://api.oh.xyz";

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
    throw new OhApiError("OhAPI is not configured. Add the server-side OHAPI_API_KEY before enabling the pilot.");
  }
  return key;
}

export async function ohApiFetch(path: string, init: RequestInit = {}) {
  const method = init.method?.toUpperCase() ?? "GET";
  const maxAttempts = method === "GET" ? 3 : 1;
  let response: Response | undefined;
  let lastNetworkError: unknown;

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
      break;
    } catch (error) {
      lastNetworkError = error;
      if (attempt < maxAttempts) await new Promise(resolve => setTimeout(resolve, attempt * 400));
    }
  }

  if (!response) {
    throw new OhApiError("OhAPI could not be reached after bounded retry attempts.", undefined);
  }

  if (!response.ok) {
    let detail = "";
    try {
      const body = await response.json() as { error?: string; message?: string };
      detail = body.message ?? body.error ?? "";
    } catch {
      // Preserve the status-specific error below when a provider body is not JSON.
    }
    throw new OhApiError(detail || `OhAPI request failed with status ${response.status}.`, response.status);
  }

  return response;
}

export async function validateOhApiCredential() {
  const response = await ohApiFetch("/api/v1/customer-library", { method: "GET" });
  return response.json() as Promise<unknown>;
}

export async function createOhApiRoom(input: {
  userGender: "male" | "female";
  characterId: string;
  textingStyle?: "default" | "short-form" | "long-form";
}) {
  const response = await ohApiFetch("/api/v1/rooms", {
    method: "POST",
    body: JSON.stringify({
      user_gender: input.userGender,
      character_id: input.characterId,
      texting_style: input.textingStyle ?? "default",
    }),
  });
  const body = await response.json() as { room_id?: string };
  if (!body.room_id) throw new OhApiError("OhAPI did not return a room identifier.");
  return body.room_id;
}

export async function generateOhApiText(input: { roomId: string; prompt: string }) {
  const response = await ohApiFetch("/api/v1/text", {
    method: "POST",
    body: JSON.stringify({ room_id: input.roomId, prompt: input.prompt }),
  });
  const body = await response.json() as { content?: string };
  if (!body.content) throw new OhApiError("OhAPI did not return text content.");
  return body.content;
}

export type OhApiDraftCharacterInput = {
  nationality: string;
  ethnicity: string;
  firstName: string;
  lastName: string;
  biography: string;
  gender: "Female" | "Male";
  dateOfBirth: string;
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

export async function saveOhApiCharacterDraft(characterGuid: string) {
  const response = await ohApiFetch("/api/v2/characters/save", {
    method: "POST",
    body: JSON.stringify({ characterGuid }),
  });
  return response.json() as Promise<{ characterGuid?: string; status?: string; message?: string; [key: string]: unknown }>;
}
