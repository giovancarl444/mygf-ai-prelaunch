import { beforeAll, describe, expect, it } from "vitest";

process.env.JWT_SECRET ||= "test-secret-long-enough-for-hs256-signing";
process.env.VITE_APP_ID ||= "mygf";

const { sdk } = await import("./_core/sdk");

/**
 * A session has to survive being read back.
 *
 * This is the round trip that nothing tested. `createSessionToken` was covered,
 * `verifySession` was covered, `requestLoginLink` was covered — and sign-in did
 * not work at all, for every customer, from the first deploy. The link was
 * issued, the token was consumed, the cookie was set, and the next request
 * threw it away because the payload carried an empty `name` and the verifier
 * required a non-empty one. Sign-in by email link has no display name to
 * supply, so it never once produced a session that could be read.
 *
 * The visible symptom was landing on /chat as a guest immediately after a
 * successful sign-in, which reads as a UI problem and is not one.
 */

const OPEN_ID = "email:5a6567677affb616f2e039f96295ce0a7b73dd75f921cca0";

describe("a session issued by this product", () => {
  it("can be read back by the thing that reads sessions", async () => {
    const token = await sdk.createSessionToken(OPEN_ID);
    const session = await sdk.verifySession(token);
    expect(session?.openId).toBe(OPEN_ID);
  });

  /**
   * Exactly what the email sign-in route passes. This is the case that failed.
   */
  it("survives having no display name, which email sign-in never has", async () => {
    const token = await sdk.createSessionToken(OPEN_ID, { name: "", expiresInMs: 60_000 });
    const session = await sdk.verifySession(token);
    expect(session).not.toBeNull();
    expect(session?.openId).toBe(OPEN_ID);
    expect(session?.name).toBe("");
  });

  it("keeps a display name when there is one", async () => {
    const token = await sdk.createSessionToken(OPEN_ID, { name: "Elliot" });
    expect((await sdk.verifySession(token))?.name).toBe("Elliot");
  });

  it("still refuses a token with no identity in it", async () => {
    const token = await sdk.signSession({ openId: "", appId: "mygf", name: "x" });
    expect(await sdk.verifySession(token)).toBeNull();
  });

  it("refuses a token signed with a different secret", async () => {
    const token = await sdk.createSessionToken(OPEN_ID);
    expect(await sdk.verifySession(`${token}tampered`)).toBeNull();
  });

  it("refuses an absent cookie rather than inventing a session", async () => {
    expect(await sdk.verifySession(undefined)).toBeNull();
    expect(await sdk.verifySession("")).toBeNull();
  });
});
