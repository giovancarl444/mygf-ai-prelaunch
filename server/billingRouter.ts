import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getActiveSubscription, getCreditBalance, PLANS } from "./billing";
import { createCheckout } from "./payments";

/**
 * The billing surface. Plans and balance are reads; checkout hands back a
 * hosted URL and the grant happens when the payment settles — never here.
 */
export const billingRouter = router({
  plans: publicProcedure.query(() => Object.values(PLANS)),

  status: protectedProcedure.query(async ({ ctx }) => ({
    subscription: await getActiveSubscription(ctx.user.id),
    creditBalance: await getCreditBalance(ctx.user.id),
  })),

  checkout: protectedProcedure
    .input(z.object({ planId: z.enum(["premium", "premium_annual"]) }))
    .mutation(async ({ ctx, input }) => {
      const configuredOrigin = process.env.PUBLIC_BASE_URL?.trim();
      const host = ctx.req.header("x-forwarded-host") ?? ctx.req.header("host") ?? "localhost:3000";
      const proto = ctx.req.header("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
      const origin = configuredOrigin || `${proto}://${host}`;

      return createCheckout({ userId: ctx.user.id, planId: input.planId, origin });
    }),
});
