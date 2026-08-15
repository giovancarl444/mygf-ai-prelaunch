import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  inserted: [] as Record<string, unknown>[],
  existingUserOpenId: null as string | null,
  tokensThisHour: 0,
  sentEmails: [] as { to: string; subject: string; text: string }[],
  cookies: [] as { name: string; value: string }[],
}));

/**
 * A fake standing in for the query builder. Only the shapes this module uses
 * are implemented — a fuller fake would be testing Drizzle rather than us.
 */
vi.mock("./db", () => ({
  getDb: vi.fn(async () => ({
    delete: () => ({ where: async () => undefined }),
    select: (columns?: Record<string, unknown>) => ({
      from: () => ({
        where: Object.assign(
          async () => (columns && "openId" in columns
            ? (state.existingUserOpenId ? [{ openId: state.existingUserOpenId }] : [])
            : [{ total: state.tokensThisHour }]),
          {
            limit: async () => (state.existingUserOpenId ? [{ openId: state.existingUserOpenId }] : []),
            orderBy: () => ({ limit: async () => [] }),
          },
        ),
      }),
    }),
    insert: () => ({ values: async (row: Record<string, unknown>) => { state.inserted.push(row); } }),
    update: () => ({ set: () => ({ where: async () => undefined }) }),
  })),
  upsertUser: vi.fn(async () => undefined),
}));

vi.mock("./email", () => ({
  sendEmail: vi.fn(async (message: { to: string; subject: string; text: string }) => {
    state.sentEmails.push(message);
    return { delivered: true };
  }),
}));

import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { LOGIN_NONCE_COOKIE } from "./auth";

function visitorCaller() {
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: { host: "mygf.example", "x-forwarded-for": "203.0.113.9" },
      get: (key: string) => (key.toLowerCase() === "host" ? "mygf.example" : undefined),
      socket: { remoteAddress: "203.0.113.9" },
    } as unknown as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string) => { state.cookies.push({ name, value }); },
    } as unknown as TrpcContext["res"],
  };
  return appRouter.createCaller(ctx);
}

beforeEach(() => {
  state.inserted = [];
  state.sentEmails = [];
  state.cookies = [];
  state.existingUserOpenId = null;
  state.tokensThisHour = 0;
  delete process.env.PUBLIC_BASE_URL;
});

describe("asking for a sign-in link", () => {
  it("emails a link to the address given", async () => {
    await visitorCaller().auth.requestLink({ email: "someone@example.com" });

    expect(state.sentEmails).toHaveLength(1);
    expect(state.sentEmails[0].to).toBe("someone@example.com");
    expect(state.sentEmails[0].text).toContain("https://mygf.example/api/auth/verify?token=");
  });

  /**
   * The token in the email is the only copy. What is stored cannot be used to
   * sign in as anyone, so reading this table is not a login.
   */
  it("stores only a hash, never the token itself", async () => {
    await visitorCaller().auth.requestLink({ email: "someone@example.com" });

    const row = state.inserted[0];
    const link = state.sentEmails[0].text;
    const token = decodeURIComponent(/token=([^\s]+)/.exec(link)![1]);

    expect(row.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(row.tokenHash).not.toBe(token);
    expect(JSON.stringify(row)).not.toContain(token);
  });

  it("binds the link to the browser that asked", async () => {
    await visitorCaller().auth.requestLink({ email: "someone@example.com" });

    const nonceCookie = state.cookies.find(cookie => cookie.name === LOGIN_NONCE_COOKIE);
    expect(nonceCookie?.value).toBe(state.inserted[0].requestNonce);
  });

  /**
   * Answering differently for a known address would make this a membership
   * oracle, and on an adult product that is a disclosure about a real person.
   */
  it("answers identically whether or not the address has an account", async () => {
    state.existingUserOpenId = null;
    const stranger = await visitorCaller().auth.requestLink({ email: "nobody@example.com" });

    state.existingUserOpenId = "manus-user-1";
    const member = await visitorCaller().auth.requestLink({ email: "member@example.com" });

    expect(stranger).toEqual(member);
    expect(stranger).toEqual({ sent: true });
  });

  it("normalises the address so casing does not create a second account", async () => {
    await visitorCaller().auth.requestLink({ email: "  Someone@Example.COM  " });
    expect(state.inserted[0].email).toBe("someone@example.com");
  });

  it("refuses something that is not an address", async () => {
    await expect(visitorCaller().auth.requestLink({ email: "not-an-email" })).rejects.toThrow();
    expect(state.sentEmails).toHaveLength(0);
  });

  it("stops someone minting links in bulk", async () => {
    state.tokensThisHour = 5;
    await expect(visitorCaller().auth.requestLink({ email: "someone@example.com" }))
      .rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    expect(state.sentEmails).toHaveLength(0);
  });

  it("uses the configured origin over the request host", async () => {
    process.env.PUBLIC_BASE_URL = "https://real-domain.com/";
    await visitorCaller().auth.requestLink({ email: "someone@example.com" });
    expect(state.sentEmails[0].text).toContain("https://real-domain.com/api/auth/verify?token=");
  });

  it("gives the link a short life", async () => {
    const before = Date.now();
    await visitorCaller().auth.requestLink({ email: "someone@example.com" });
    const expiresAt = state.inserted[0].expiresAt as Date;

    expect(expiresAt.getTime()).toBeGreaterThan(before);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(before + 15 * 60 * 1000 + 1_000);
  });
});
