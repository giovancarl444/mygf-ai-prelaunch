import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { billingRouter } from "./billingRouter";
import { ohapiChatRouter } from "./ohapiChat";
import { ohapiCompanionsRouter } from "./ohapiCompanions";
import { ohapiMediaRouter } from "./ohapiMedia";
import { ohapiStudioRouter } from "./ohapiStudio";
import { clearGuestSession } from "./ohapiGuest";
import { requestLoginLink } from "./auth";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      clearGuestSession(ctx.res, ctx.req);
      return { success: true } as const;
    }),
    // Sign-in we issue ourselves, rather than through an identity provider on
    // a platform this product is leaving.
    requestLink: requestLoginLink,
  }),
  // Public discovery: every listed companion is one the provider can actually open.
  companions: ohapiCompanionsRouter,
  // Account-owned conversation and generation.
  chat: ohapiChatRouter,
  media: ohapiMediaRouter,
  // Plans, balance, and hosted checkout. The grant happens on settlement,
  // never inside the checkout procedure itself.
  billing: billingRouter,
  // Owner-only operations, reachable exclusively from /ops/ohapi.
  ohapiStudio: ohapiStudioRouter,
});

export type AppRouter = typeof appRouter;
