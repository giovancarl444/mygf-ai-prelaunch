import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { GUEST_OPEN_ID_PREFIX, isGuestOpenId } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import {
  countOwnedOhapiMediaJobs,
  countOwnedOhapiUserMessages,
  createGuestUser,
  getUserById,
} from "./ohapiDb";

/**
 * Letting someone talk before asking them to sign up.
 *
 * A cold visitor landing on a companion from search will not create an account
 * to find out whether the product is any good. They will leave. So the wall
 * moves: browse and talk first, sign up to keep it.
 *
 * A guest is a real row in `users`, distinguished only by the shape of its
 * `openId`. That is deliberate — every ownership check, allowance, media job,
 * and the safety protocol already key on a user id, and none of them need to
 * learn about a second kind of account. The alternative was a parallel identity
 * threaded through all of it, which is how ownership bugs get written.
 */

export const GUEST_COOKIE = "mygf_guest";

/** What a visitor gets before being asked for anything. */
export const GUEST_MESSAGE_LIMIT = 3;
export const GUEST_MEDIA_LIMIT = 1;

/**
 * A lifetime allowance, not an hourly one. The hourly limits bound cost for
 * accounts; this bounds it for people who have not made one, and resetting it
 * every hour would make it free.
 */
export const GUEST_LIMIT_REACHED =
  "Create a free account to keep talking — your conversation is saved.";

export function isGuestUser(user: { openId: string }) {
  return isGuestOpenId(user.openId);
}

/** Ninety days. Long enough that a visitor who comes back still has their thread. */
const GUEST_COOKIE_MAX_AGE = 90 * 24 * 60 * 60 * 1000;

export function readGuestCookie(req: Request): number | null {
  const raw = req.headers.cookie;
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name !== GUEST_COOKIE) continue;
    const id = Number.parseInt(decodeURIComponent(rest.join("=")), 10);
    return Number.isInteger(id) && id > 0 ? id : null;
  }
  return null;
}

/**
 * Resolves the guest a request already belongs to. Never creates one.
 *
 * Creation is deliberately not here: this runs on every request, including
 * every crawler fetching every page, and a row per crawl would be its own
 * problem.
 */
export async function resolveGuestUser(req: Request) {
  const id = readGuestCookie(req);
  if (!id) return null;
  const user = await getUserById(id).catch(() => undefined);
  if (!user || !isGuestUser(user)) return null;
  return user;
}

/**
 * Creates the guest identity, at the one moment it is warranted: someone has
 * confirmed they are an adult and is about to talk to a companion.
 */
export async function startGuestSession(res: Response, req: Request) {
  const user = await createGuestUser(`${GUEST_OPEN_ID_PREFIX}${randomUUID()}`);
  res.cookie(GUEST_COOKIE, String(user.id), {
    ...getSessionCookieOptions(req),
    maxAge: GUEST_COOKIE_MAX_AGE,
  });
  return user;
}

export function clearGuestSession(res: Response, req: Request) {
  res.clearCookie(GUEST_COOKIE, getSessionCookieOptions(req));
}

/** What a guest has left before the wall. Accounts are unaffected by this. */
export async function describeGuestAllowance(user: { id: number; openId: string }) {
  if (!isGuestUser(user)) {
    return { isGuest: false, messagesLeft: null, mediaLeft: null };
  }
  const [messages, media] = await Promise.all([
    countOwnedOhapiUserMessages(user.id),
    countOwnedOhapiMediaJobs(user.id),
  ]);
  return {
    isGuest: true,
    messagesLeft: Math.max(GUEST_MESSAGE_LIMIT - messages, 0),
    mediaLeft: Math.max(GUEST_MEDIA_LIMIT - media, 0),
  };
}
