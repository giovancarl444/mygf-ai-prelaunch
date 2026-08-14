import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "./_core/trpc";
import { getUserAdultConfirmedAt } from "./ohapiDb";

export const ADULT_CONFIRMATION_REQUIRED =
  "Confirm that you are an adult before starting or continuing a companion conversation.";

/**
 * Every generative companion operation runs through this.
 *
 * The browser checkbox is a convenience; this is the enforcement point. Reading
 * the stored timestamp rather than trusting a request field means a crafted
 * client cannot generate adult content by omitting the flag.
 */
export const adultProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const adultConfirmedAt = await getUserAdultConfirmedAt(ctx.user.id);
  if (!adultConfirmedAt) {
    throw new TRPCError({ code: "FORBIDDEN", message: ADULT_CONFIRMATION_REQUIRED });
  }
  return next({ ctx: { ...ctx, user: ctx.user, adultConfirmedAt } });
});
