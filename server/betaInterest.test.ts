import { describe, expect, it, vi } from "vitest";
import {
  betaInterestInputSchema,
  buildBetaInterestNotification,
  submitBetaInterest,
} from "./betaInterest";

describe("beta interest validation", () => {
  it("accepts the explicit optional interest choices and rejects other values", () => {
    expect(betaInterestInputSchema.parse({ email: "person@example.com", interest: "imaginative roleplay" })).toMatchObject({
      email: "person@example.com",
      interest: "imaginative roleplay",
    });
    expect(() => betaInterestInputSchema.parse({ email: "person@example.com", interest: "therapy" })).toThrow();
  });
});

describe("submitBetaInterest", () => {
  it("normalizes and persists a new interest, then notifies the owner", async () => {
    const findByEmail = vi.fn().mockResolvedValue(undefined);
    const create = vi.fn().mockResolvedValue(undefined);
    const notify = vi.fn().mockResolvedValue(true);

    const result = await submitBetaInterest(
      { email: "  EARLY@EXAMPLE.COM  ", interest: "story/character continuity" },
      { findByEmail, create, notify }
    );

    expect(result).toEqual({ status: "created", notificationSent: true });
    expect(create).toHaveBeenCalledWith({
      email: "early@example.com",
      interest: "story/character continuity",
      source: "prelaunch-landing",
    });
    expect(notify).toHaveBeenCalledWith(buildBetaInterestNotification({
      email: "early@example.com",
      interest: "story/character continuity",
    }));
  });

  it("does not create another record or alert for an existing email", async () => {
    const findByEmail = vi.fn().mockResolvedValue({ id: 1 });
    const create = vi.fn().mockResolvedValue(undefined);
    const notify = vi.fn().mockResolvedValue(true);

    const result = await submitBetaInterest(
      { email: "early@example.com" },
      { findByEmail, create, notify }
    );

    expect(result).toEqual({ status: "already_registered", notificationSent: false });
    expect(create).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it("keeps the sign-up successful if the alert service is unavailable", async () => {
    const result = await submitBetaInterest(
      { email: "early@example.com", interest: "curious about AI" },
      {
        findByEmail: vi.fn().mockResolvedValue(undefined),
        create: vi.fn().mockResolvedValue(undefined),
        notify: vi.fn().mockResolvedValue(false),
      }
    );

    expect(result).toEqual({ status: "created", notificationSent: false });
  });
});
