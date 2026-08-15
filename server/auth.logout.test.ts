import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import { GUEST_COOKIE } from "./ohapiGuest";
import type { TrpcContext } from "./_core/context";

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[] } {
  const clearedCookies: CookieCall[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();
    const session = clearedCookies.find(cookie => cookie.name === COOKIE_NAME);

    expect(result).toEqual({ success: true });
    expect(session?.options).toMatchObject({
      maxAge: -1,
      secure: true,
      sameSite: "lax",
      httpOnly: true,
      path: "/",
    });
  });

  /**
   * Signing out has to end both identities. Leaving the guest cookie behind
   * would drop the customer straight back into a guest session on the same
   * browser, which on a shared machine is the last thing signing out should do.
   */
  it("ends the guest identity as well as the account session", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    await appRouter.createCaller(ctx).auth.logout();

    expect(clearedCookies.map(cookie => cookie.name)).toEqual(
      expect.arrayContaining([COOKIE_NAME, GUEST_COOKIE]),
    );
  });
});
