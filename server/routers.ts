import { COOKIE_NAME } from "@shared/const";
import { betaInterestInputSchema, submitBetaInterest } from "./betaInterest";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { ohapiPilotRouter } from "./ohapiPilot";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  betaInterest: router({
    submit: publicProcedure.input(betaInterestInputSchema).mutation(({ input }) => submitBetaInterest(input)),
  }),
  ohapiPilot: ohapiPilotRouter,
});

export type AppRouter = typeof appRouter;
