import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The storage seam without a bucket: what gets copied, what key it lands
 * under, and — the property the gallery depends on — that every failure mode
 * degrades to the provider's link instead of an error.
 */
const send = vi.hoisted(() => vi.fn());

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn(() => ({ send })),
  PutObjectCommand: vi.fn((input: Record<string, unknown>) => ({ input })),
}));

import { copyMediaResult, extensionForContentType, isMediaStorageConfigured } from "./mediaStorage";

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

const CONFIGURED = {
  STORAGE_ENDPOINT: "https://fra1.digitaloceanspaces.com",
  STORAGE_REGION: "fra1",
  STORAGE_BUCKET: "mygf-media",
  STORAGE_ACCESS_KEY: "key",
  STORAGE_SECRET_KEY: "secret",
  STORAGE_PUBLIC_BASE: "https://mygf-media.fra1.cdn.digitaloceanspaces.com",
};

const pngResponse = () => new Response(new Uint8Array([137, 80, 78, 71]), {
  status: 200, headers: { "content-type": "image/png" },
});

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => pngResponse()));
  send.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...originalEnv };
  for (const name of Object.keys(CONFIGURED)) delete process.env[name];
});

describe("configuration gate", () => {
  it("is off with nothing configured", () => {
    expect(isMediaStorageConfigured()).toBe(false);
  });

  it("skips the copy entirely when unconfigured", async () => {
    const url = await copyMediaResult({ sourceUrl: "https://provider/x.png", userId: 7, kind: "image", providerJobId: "job-1" });
    expect(url).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
});

describe("copying a completed result", () => {
  beforeEach(() => {
    Object.assign(process.env, CONFIGURED);
  });

  it("stores under a per-customer key and returns the durable URL", async () => {
    const url = await copyMediaResult({ sourceUrl: "https://provider/x.png", userId: 7, kind: "image", providerJobId: "job-1" });

    expect(url).toBe(`${CONFIGURED.STORAGE_PUBLIC_BASE}/media/7/image/job-1.png`);
    const { input } = send.mock.calls[0][0] as { input: Record<string, unknown> };
    expect(input.Bucket).toBe("mygf-media");
    expect(input.Key).toBe("media/7/image/job-1.png");
    expect(input.ContentType).toBe("image/png");
    expect(input.ACL).toBe("public-read");
  });

  it("returns null when the upload fails, instead of throwing", async () => {
    send.mockRejectedValueOnce(new Error("spaces is down"));
    const url = await copyMediaResult({ sourceUrl: "https://provider/x.png", userId: 7, kind: "image", providerJobId: "job-2" });
    expect(url).toBeNull();
  });

  it("returns null when the source cannot be fetched", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("gone", { status: 404 })));
    const url = await copyMediaResult({ sourceUrl: "https://provider/x.png", userId: 7, kind: "image", providerJobId: "job-3" });
    expect(url).toBeNull();
    expect(send).not.toHaveBeenCalled();
  });
});

describe("content type to extension", () => {
  it("maps the formats the provider returns", () => {
    expect(extensionForContentType("image/png")).toBe("png");
    expect(extensionForContentType("video/mp4")).toBe("mp4");
    expect(extensionForContentType("audio/wav")).toBe("wav");
    expect(extensionForContentType("audio/mpeg")).toBe("mp3");
    expect(extensionForContentType("image/png; charset=binary")).toBe("png");
    expect(extensionForContentType(null)).toBe("bin");
    expect(extensionForContentType("application/x-unknown")).toBe("bin");
  });
});
