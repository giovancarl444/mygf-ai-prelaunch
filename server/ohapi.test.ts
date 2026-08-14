import { describe, expect, it } from "vitest";
import { shouldRetrySafeOhApiGet, validateOhApiCredential } from "./ohapi";

function summarizeLibrary(value: unknown) {
  if (!value || typeof value !== "object") return { kind: typeof value };
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
      if (!Array.isArray(entry)) return [key, typeof entry];
      return [key, {
        count: entry.length,
        firstItemKeys: entry[0] && typeof entry[0] === "object" ? Object.keys(entry[0] as Record<string, unknown>) : [],
        sample: entry.slice(0, 3).map(item => {
          if (!item || typeof item !== "object") return item;
          const record = item as Record<string, unknown>;
          return {
            id: record.id ?? null,
            characterId: record.characterId ?? record.character_id ?? null,
            name: record.name ?? record.displayName ?? null,
            status: record.status ?? null,
          };
        }),
      }];
    }),
  );
}

describe("OhAPI credential", () => {
  const liveTest = process.env.RUN_OHAPI_LIVE_TESTS === "true" ? it : it.skip;

  liveTest("validates the configured partner key with the documented customer-library endpoint", async () => {
    const library = await validateOhApiCredential();
    expect(library).toBeDefined();
    console.info("OhAPI library summary:", JSON.stringify(summarizeLibrary(library)));
  }, 30_000);
});

describe("OhAPI safe retry policy", () => {
  it("retries only documented transient statuses on safe GET requests", () => {
    expect(shouldRetrySafeOhApiGet("GET", 429)).toBe(true);
    expect(shouldRetrySafeOhApiGet("GET", 503)).toBe(true);
    expect(shouldRetrySafeOhApiGet("GET", 400)).toBe(false);
    expect(shouldRetrySafeOhApiGet("POST", 503)).toBe(false);
  });
});
