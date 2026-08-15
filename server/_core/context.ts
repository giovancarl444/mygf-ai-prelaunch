import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { resolveGuestUser } from "../ohapiGuest";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // A visitor who has confirmed their age but not created an account still has
  // an identity, so ownership, allowances, and the safety protocol all work on
  // one code path. Resolved only — never created here, or every crawl would
  // make a row.
  if (!user) {
    user = await resolveGuestUser(opts.req).catch(() => null);
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
