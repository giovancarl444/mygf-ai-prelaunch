import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const values = vi.fn();
  const insert = vi.fn(() => ({ values }));
  return { values, insert };
});

vi.mock("./db", () => ({ getDb: vi.fn(async () => ({ insert: mocks.insert })) }));

import { createOhapiAdminAudit, sanitizeOhapiAdminAuditDetail } from "./ohapiDb";

describe("OhAPI admin audit sanitization", () => {
  beforeEach(() => {
    mocks.values.mockClear();
    mocks.insert.mockClear();
  });

  it("writes an allowlisted reviewed-action outcome without credentials or raw diagnostics", async () => {
    await createOhapiAdminAudit({
      userId: 1,
      action: "draft_generated",
      providerIdentifier: "draft-guid",
      outcome: "succeeded",
      detail: "Private candidate generated; review required before save.",
    });
    expect(mocks.values).toHaveBeenCalledWith(expect.objectContaining({
      action: "draft_generated",
      providerIdentifier: "draft-guid",
      outcome: "succeeded",
      detail: "Private candidate generated; review required before save.",
    }));
  });

  it("replaces unexpected provider or credential text in a failed action with a safe classification", async () => {
    const rawDetail = "provider returned api key abc123 and an upstream stack trace";
    await createOhapiAdminAudit({ userId: 1, action: "draft_save_requested", outcome: "failed", detail: rawDetail });
    expect(mocks.values).toHaveBeenCalledWith(expect.objectContaining({ action: "draft_save_requested", outcome: "failed", detail: "sanitized" }));
    expect(sanitizeOhapiAdminAuditDetail("provider_403")).toBe("provider_403");
    expect(sanitizeOhapiAdminAuditDetail(rawDetail)).not.toContain("abc123");
  });
});
