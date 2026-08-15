import { describe, expect, it, vi } from "vitest";
import { GUEST_OPEN_ID_PREFIX, isGuestOpenId } from "@shared/const";

vi.mock("./ohapiDb", () => ({
  countOwnedOhapiMediaJobs: vi.fn(),
  countOwnedOhapiUserMessages: vi.fn(),
  createGuestUser: vi.fn(),
  getUserById: vi.fn(),
}));

const { isGuestUser } = await import("./ohapiGuest");

/**
 * A guest is a real `users` row, distinguished from an account by nothing but
 * the prefix on its `openId`. That is a deliberate choice — ownership,
 * allowances, and the safety protocol all key on a user id and none of them
 * need to learn about a second kind of account — and it has one consequence
 * that has to be defended rather than remembered.
 *
 * Anything asking "is this person signed in?" gets a truthy user for someone
 * who has never signed up. The client asked exactly that, with
 * `Boolean(user)`, and so showed a visitor a "Sign out" button, told them they
 * had an account, and hid the sign-up that every conversion in the funnel
 * depends on. Nothing failed; it just quietly stopped asking anyone to
 * register.
 *
 * The check now lives in one shared place. These lock the two sides to it.
 */
describe("telling a visitor apart from an account", () => {
  it("recognises the identities the server actually mints", () => {
    const minted = `${GUEST_OPEN_ID_PREFIX}e3ac36bd-7a8c-4376-b2da-f33e36f8a535`;
    expect(isGuestOpenId(minted)).toBe(true);
    expect(isGuestUser({ openId: minted })).toBe(true);
  });

  it("does not mistake a real account for a visitor", () => {
    for (const openId of ["user-42", "email:someone@example.com", "0f2c1a", "notguest:1"]) {
      expect(isGuestOpenId(openId)).toBe(false);
      expect(isGuestUser({ openId })).toBe(false);
    }
  });

  /**
   * The client reads `openId` off a query that has not resolved yet, and an
   * absent user is not a guest — it is nobody.
   */
  it.each([null, undefined, ""])("treats %j as neither", value => {
    expect(isGuestOpenId(value as string | null | undefined)).toBe(false);
  });

  /**
   * Both sides import the same constant; this fails if either grows its own
   * copy of the string, which is the drift the shared definition exists to
   * prevent.
   */
  it("keeps the server and the client agreeing on what the prefix is", () => {
    expect(GUEST_OPEN_ID_PREFIX).toBe("guest:");
    expect(isGuestUser({ openId: `${GUEST_OPEN_ID_PREFIX}x` })).toBe(isGuestOpenId(`${GUEST_OPEN_ID_PREFIX}x`));
  });
});
