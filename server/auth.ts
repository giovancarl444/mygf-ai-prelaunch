import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gt, isNull, lt, sql } from "drizzle-orm";
import type { Express, Request, Response } from "express";
import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { authLoginTokens, users } from "../drizzle/schema";
import { getDb } from "./db";
import { upsertUser } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { publicProcedure } from "./_core/trpc";
import { sendEmail } from "./email";
import { clearGuestSession } from "./ohapiGuest";

/**
 * Signing in, without anyone else's permission.
 *
 * Authentication used to run through an identity provider on a platform this
 * product is leaving. Losing that provider means losing every account, which
 * is not a risk worth carrying for a login box.
 *
 * The session itself was never the dependency: it is an HS256 JWT signed with
 * our own `JWT_SECRET` and verified locally. Only the step that established
 * *who* someone is went off-site. So that is the only step replaced here — a
 * link to an email address, and no password to store, leak, reset, or have
 * reused from somewhere else.
 */

const TOKEN_TTL_MS = 15 * 60 * 1000;
const REQUESTS_PER_EMAIL_PER_HOUR = 5;
const REQUESTS_PER_IP_PER_HOUR = 20;

/** Binds a link to the browser that asked for it. */
export const LOGIN_NONCE_COOKIE = "mygf_login";
const NONCE_TTL_MS = 30 * 60 * 1000;

const emailSchema = z.string().trim().toLowerCase().email("Enter an email address we can reach you at.").max(320);

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Sign-in is unavailable right now." });
  return db;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function clientIp(req: Request) {
  const forwarded = req.headers["x-forwarded-for"];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0];
  return (first ?? req.socket.remoteAddress ?? "").trim().slice(0, 64) || null;
}

/**
 * An account for this address, reusing one that already exists.
 *
 * The lookup is by email before anything else, and that is the whole migration
 * story: accounts created through the old identity provider are matched on the
 * address they signed up with, so switching how people log in does not orphan
 * anyone's conversations.
 */
async function resolveOpenIdForEmail(email: string) {
  const db = await requireDb();
  const [existing] = await db.select({ openId: users.openId })
    .from(users).where(eq(users.email, email)).limit(1);
  if (existing) return existing.openId;
  return `email:${createHash("sha256").update(email).digest("hex").slice(0, 48)}`;
}

async function withinRateLimits(email: string, ip: string | null) {
  const db = await requireDb();
  const since = new Date(Date.now() - 60 * 60 * 1000);

  const [byEmail] = await db.select({ total: sql<number>`count(*)` }).from(authLoginTokens)
    .where(and(eq(authLoginTokens.email, email), gt(authLoginTokens.createdAt, since)));
  if (Number(byEmail?.total ?? 0) >= REQUESTS_PER_EMAIL_PER_HOUR) return false;

  if (ip) {
    const [byIp] = await db.select({ total: sql<number>`count(*)` }).from(authLoginTokens)
      .where(and(eq(authLoginTokens.requestedIp, ip), gt(authLoginTokens.createdAt, since)));
    if (Number(byIp?.total ?? 0) >= REQUESTS_PER_IP_PER_HOUR) return false;
  }

  return true;
}

function loginEmail(link: string) {
  return [
    "Here is your sign-in link:",
    "",
    link,
    "",
    "It works once and expires in 15 minutes.",
    "",
    "If you did not ask to sign in, you can ignore this — nobody can get into your account with this email alone.",
  ].join("\n");
}

/**
 * Asks for a sign-in link.
 *
 * Answers the same way whether or not the address has an account. Telling an
 * anonymous caller which addresses are registered would turn this into a
 * membership oracle, and on an adult product that is a meaningful disclosure
 * about a real person.
 *
 * Exported as a procedure rather than a router so it composes into the existing
 * `auth` namespace beside `me` and `logout`.
 */
export const requestLoginLink = publicProcedure
  .input(z.object({ email: emailSchema }))
  .mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const ip = clientIp(ctx.req);

    // Old rows are cleared here rather than on a schedule: this is the only
    // path that writes them, so it is the only path that needs to tidy up.
    await db.delete(authLoginTokens).where(lt(authLoginTokens.expiresAt, new Date(Date.now() - TOKEN_TTL_MS)));

    if (!await withinRateLimits(input.email, ip)) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "That is a lot of sign-in links. Check your inbox, or try again in a little while.",
      });
    }

    const token = randomBytes(32).toString("base64url");
    const nonce = randomUUID();
    await db.insert(authLoginTokens).values({
      tokenHash: hashToken(token),
      email: input.email,
      requestNonce: nonce,
      requestedIp: ip,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    });

    ctx.res.cookie(LOGIN_NONCE_COOKIE, nonce, {
      ...getSessionCookieOptions(ctx.req),
      maxAge: NONCE_TTL_MS,
    });

    const origin = process.env.PUBLIC_BASE_URL?.replace(/\/+$/, "")
      ?? `${ctx.req.protocol}://${ctx.req.get("host")}`;
    const link = `${origin}/api/auth/verify?token=${encodeURIComponent(token)}`;

    await sendEmail({
      to: input.email,
      subject: "Your sign-in link",
      text: loginEmail(link),
    });

    return { sent: true };
  });

/**
 * Turns a link into a session.
 *
 * Consuming happens on GET because that is what an email client will follow,
 * which means automated scanners follow it too. The nonce cookie is what
 * separates the two: a scanner in a datacentre does not have it, so the token
 * is left unconsumed and the customer's own click still works.
 */
export function registerAuthRoutes(app: Express) {
  app.get("/api/auth/verify", async (req: Request, res: Response) => {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    if (!token) return res.redirect(302, "/signin?error=missing");

    try {
      const db = await getDb();
      if (!db) return res.redirect(302, "/signin?error=unavailable");

      const [record] = await db.select().from(authLoginTokens)
        .where(and(
          eq(authLoginTokens.tokenHash, hashToken(token)),
          isNull(authLoginTokens.consumedAt),
          gt(authLoginTokens.expiresAt, new Date()),
        ))
        .orderBy(desc(authLoginTokens.createdAt))
        .limit(1);

      if (!record) return res.redirect(302, "/signin?error=expired");

      // Compared in constant time out of habit rather than necessity — both
      // values are ours, but nonce comparison is the kind of thing that gets
      // copied into a place where it does matter.
      const presented = String(req.cookies?.[LOGIN_NONCE_COOKIE] ?? parseCookie(req, LOGIN_NONCE_COOKIE) ?? "");
      const expected = record.requestNonce;
      const nonceMatches = presented.length === expected.length
        && timingSafeEqual(Buffer.from(presented), Buffer.from(expected));

      if (!nonceMatches) {
        // A different device, or something following links on the customer's
        // behalf. The token is deliberately left unspent.
        return res.redirect(302, "/signin?error=otherdevice");
      }

      await db.update(authLoginTokens)
        .set({ consumedAt: new Date() })
        .where(eq(authLoginTokens.id, record.id));

      const openId = await resolveOpenIdForEmail(record.email);
      await upsertUser({
        openId,
        email: record.email,
        loginMethod: "email",
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(openId, { name: "", expiresInMs: ONE_YEAR_MS });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.clearCookie(LOGIN_NONCE_COOKIE, cookieOptions);

      // The guest cookie stays: the client claims that conversation onto the
      // new account on its next load, and clearing it here would throw away
      // the thread that persuaded them to sign up.
      return res.redirect(302, "/chat");
    } catch (error) {
      console.error("[Auth] Verification failed:", error);
      return res.redirect(302, "/signin?error=unavailable");
    }
  });

  app.post("/api/auth/signout", (req: Request, res: Response) => {
    const options = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, options);
    clearGuestSession(res, req);
    res.json({ signedOut: true });
  });
}

/** The app does not mount a cookie parser, so this reads the header directly. */
function parseCookie(req: Request, name: string) {
  const raw = req.headers.cookie;
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}
