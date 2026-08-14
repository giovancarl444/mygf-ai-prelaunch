import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  generateDraft: vi.fn(),
  getDraftStatus: vi.fn(),
  saveDraft: vi.fn(),
  audit: vi.fn(),
  upsertCharacter: vi.fn(),
  OhApiErrorMock: class MockOhApiError extends Error {
    constructor(message: string, readonly status?: number) {
      super(message);
    }
  },
}));

vi.mock("./ohapi", () => ({
  OhApiError: mocks.OhApiErrorMock,
  generateOhApiCharacterDraft: mocks.generateDraft,
  getOhApiCharacterDraftStatus: mocks.getDraftStatus,
  saveOhApiCharacterDraft: mocks.saveDraft,
  createOhApiRoom: vi.fn(),
  generateOhApiText: vi.fn(),
}));

vi.mock("./ohapiDb", () => ({
  clearOwnedOhapiRoom: vi.fn(),
  consumeOhapiTextAllowance: vi.fn(),
  createOhapiAdminAudit: mocks.audit,
  createOhapiMessage: vi.fn(),
  createOhapiReport: vi.fn(),
  createOwnedOhapiRoom: vi.fn(),
  getApprovedOhapiCharacter: vi.fn(),
  getOwnedOhapiRoom: vi.fn(),
  listApprovedOhapiCharacters: vi.fn(),
  listOwnedOhapiMessages: vi.fn(),
  renameOwnedOhapiRoom: vi.fn(),
  touchOhapiRoom: vi.fn(),
  upsertApprovedOhapiCharacter: mocks.upsertCharacter,
}));

import { ohapiPilotRouter } from "./ohapiPilot";

const draftGuid = "11111111-1111-4111-8111-111111111111";
const adminContext: TrpcContext = {
  user: { id: 1, openId: "owner", name: "Owner", email: "owner@example.com", loginMethod: "manus", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
};

function caller() {
  mocks.generateDraft.mockReset();
  mocks.getDraftStatus.mockReset();
  mocks.saveDraft.mockReset();
  mocks.audit.mockReset();
  mocks.upsertCharacter.mockReset();
  return ohapiPilotRouter.createCaller(adminContext);
}

const draftInput = {
  nationality: "American",
  ethnicity: "Caucasian",
  firstName: "Camille",
  lastName: "Rowan",
  biography: "A clearly adult fictional AI companion with an observant creative-professional point of view.",
  gender: "Female" as const,
  dateOfBirth: "1993-10-14",
};

describe("owner provider mutation audit trail", () => {
  it("records generation success and sanitized provider failure", async () => {
    let admin = caller();
    mocks.generateDraft.mockResolvedValue({ characterGuid: draftGuid });
    await admin.admin.generateDraft(draftInput);
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "draft_generated", providerIdentifier: draftGuid, outcome: "succeeded", detail: "Private candidate generated; review required before save." }));

    admin = caller();
    mocks.generateDraft.mockRejectedValue(new mocks.OhApiErrorMock("upstream key should never persist", 429));
    await expect(admin.admin.generateDraft(draftInput)).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "draft_generated", outcome: "failed", detail: "provider_429" }));
  });

  it("records save success and sanitized provider failure", async () => {
    let admin = caller();
    mocks.saveDraft.mockResolvedValue({ status: "queued" });
    await admin.admin.saveDraft({ characterGuid: draftGuid });
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "draft_save_requested", providerIdentifier: draftGuid, outcome: "succeeded", detail: "Save request accepted; provider confirmation pending." }));

    admin = caller();
    mocks.saveDraft.mockRejectedValue(new mocks.OhApiErrorMock("raw provider response", 403));
    await expect(admin.admin.saveDraft({ characterGuid: draftGuid })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "draft_save_requested", providerIdentifier: draftGuid, outcome: "failed", detail: "provider_403" }));
  });

  it("records mapping success and a failed saved-status gate", async () => {
    let admin = caller();
    mocks.getDraftStatus.mockResolvedValue({ status: "saved", characterId: "provider-camille" });
    mocks.upsertCharacter.mockResolvedValue({ id: 2, worldSlug: "camille-rowan" });
    await admin.admin.mapApprovedCharacter({ worldSlug: "camille-rowan", displayName: "Camille Rowan", characterGuid: draftGuid, providerCharacterId: "provider-camille" });
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "character_mapping_approved", providerIdentifier: "provider-camille", outcome: "succeeded", detail: "World mapping approved." }));

    admin = caller();
    mocks.getDraftStatus.mockResolvedValue({ status: "ready", characterId: "provider-camille" });
    await expect(admin.admin.mapApprovedCharacter({ worldSlug: "camille-rowan", displayName: "Camille Rowan", characterGuid: draftGuid, providerCharacterId: "provider-camille" })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "character_mapping_approved", providerIdentifier: "provider-camille", outcome: "failed", detail: "provider_unknown" }));
  });
});
