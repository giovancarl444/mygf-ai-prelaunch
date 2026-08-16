import { and, desc, eq, gt, sql } from "drizzle-orm";
import { creditLedger, payments, subscriptions } from "../drizzle/schema";
import { getDb } from "./db";
import { GUEST_MEDIA_LIMIT, GUEST_MESSAGE_LIMIT, isGuestUser } from "./ohapiGuest";

/**
 * What an account may do, and what it paid to be able to.
 *
 * **The load-bearing decision in this file is that entitlements do not know how
 * anyone paid.** A card processor, a crypto settlement, and a comped account
 * all arrive through `settlePayment` and grant the same thing. That is not
 * abstraction for its own sake: in this category the payment rail is the
 * component most likely to be taken away without notice, and a processor
 * change should be a new function that calls `settlePayment`, not a change to
 * how allowances are computed.
 *
 * It is also why crypto is cheap to add here rather than a project. It settles
 * differently — on confirmations rather than an authorisation — but it grants
 * identically.
 */

/* -------------------------------------------------------------------------- */
/* Plans                                                                       */
/* -------------------------------------------------------------------------- */

export type PlanId = "free" | "premium" | "premium_annual";

export type Plan = {
  id: PlanId;
  name: string;
  priceCents: number;
  /** Billing period in days. Zero for the plan nobody pays for. */
  periodDays: number;
  hourlyTextLimit: number;
  hourlyMediaLimit: number;
  /**
   * Media included in the price, per billing period, in our credit units.
   * Beyond this, purchased credits are spent.
   */
  includedMediaCredits: number;
};

/**
 * Prices and allowances live in code rather than in the database.
 *
 * Changing what a customer gets for their money should require a review and a
 * deploy, not an UPDATE. It also keeps one source of truth for the margin
 * arithmetic in MONETIZATION.md.
 *
 * `includedMediaCredits` is the number to revisit once the provider's cost per
 * image is known — see the formula in MONETIZATION.md. It is deliberately
 * conservative until then: too low is a complaint, too high is a business that
 * loses money on its best customers.
 */
export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    priceCents: 0,
    periodDays: 0,
    hourlyTextLimit: 20,
    hourlyMediaLimit: 0,
    includedMediaCredits: 0,
  },
  premium: {
    id: "premium",
    name: "Premium",
    priceCents: 1499,
    periodDays: 30,
    hourlyTextLimit: 120,
    hourlyMediaLimit: 20,
    includedMediaCredits: 40,
  },
  premium_annual: {
    id: "premium_annual",
    name: "Premium, annual",
    priceCents: 8388,
    periodDays: 365,
    hourlyTextLimit: 120,
    hourlyMediaLimit: 20,
    // Monthly-equivalent, granted per 30-day window rather than 480 up front:
    // a year's allowance handed over on day one is a year's provider cost
    // exposed to a day-two refund.
    includedMediaCredits: 40,
  },
};

/**
 * What each generation costs in **our** credits.
 *
 * Ours, not the provider's. Their pricing is an implementation detail, and
 * exposing it would tell every customer our margin and tie our price list to
 * someone else's. Video is heavier because it genuinely is.
 */
export const MEDIA_CREDIT_COST: Record<"image" | "audio" | "video", number> = {
  image: 1,
  audio: 1,
  video: 10,
};

/* -------------------------------------------------------------------------- */
/* Entitlements                                                                */
/* -------------------------------------------------------------------------- */

export type Entitlements = {
  planId: PlanId;
  plan: Plan;
  isGuest: boolean;
  hourlyTextLimit: number;
  hourlyMediaLimit: number;
  /** Included media credits left in the current period. */
  includedRemaining: number;
  /** Purchased credits, which do not expire. */
  creditBalance: number;
  periodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
};

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  return db;
}

/** The subscription an account is actually inside the paid period of. */
export async function getActiveSubscription(userId: number, now = new Date()) {
  const db = await requireDb();
  const [row] = await db.select().from(subscriptions).where(and(
    eq(subscriptions.userId, userId),
    eq(subscriptions.status, "active"),
    gt(subscriptions.currentPeriodEnd, now),
  )).orderBy(desc(subscriptions.currentPeriodEnd)).limit(1);
  return row ?? null;
}

/** Purchased credits remaining. The sum of the ledger, never a stored column. */
export async function getCreditBalance(userId: number) {
  const db = await requireDb();
  const [row] = await db.select({ balance: sql<number>`coalesce(sum(${creditLedger.delta}), 0)` })
    .from(creditLedger).where(eq(creditLedger.userId, userId));
  return Number(row?.balance ?? 0);
}

/**
 * Included media already used this period.
 *
 * Counted from the media jobs themselves rather than tracked separately, so
 * there is no second number that can drift out of agreement with reality.
 */
async function includedUsedThisPeriod(userId: number, since: Date) {
  const db = await requireDb();
  const [row] = await db.select({ total: sql<number>`coalesce(sum(${creditLedger.delta}), 0)` })
    .from(creditLedger).where(and(
      eq(creditLedger.userId, userId),
      eq(creditLedger.reason, "spend"),
      gt(creditLedger.createdAt, since),
    ));
  // Spends are negative; what was consumed is the magnitude.
  return Math.abs(Number(row?.total ?? 0));
}

/**
 * Everything the allowance checks need, for anyone — guest, free, or paying.
 *
 * A guest is answered without touching the subscription tables at all: they
 * cannot have one, and the fixed trial numbers are the whole story.
 */
export async function resolveEntitlements(
  user: { id: number; openId: string },
  now = new Date(),
): Promise<Entitlements> {
  if (isGuestUser(user)) {
    return {
      planId: "free",
      plan: PLANS.free,
      isGuest: true,
      hourlyTextLimit: GUEST_MESSAGE_LIMIT,
      hourlyMediaLimit: GUEST_MEDIA_LIMIT,
      includedRemaining: 0,
      creditBalance: 0,
      periodEnd: null,
      cancelAtPeriodEnd: false,
    };
  }

  const subscription = await getActiveSubscription(user.id, now);
  const plan = PLANS[(subscription?.planId as PlanId) ?? "free"] ?? PLANS.free;

  if (!subscription) {
    return {
      planId: "free",
      plan: PLANS.free,
      isGuest: false,
      hourlyTextLimit: PLANS.free.hourlyTextLimit,
      hourlyMediaLimit: PLANS.free.hourlyMediaLimit,
      includedRemaining: 0,
      creditBalance: await getCreditBalance(user.id),
      periodEnd: null,
      cancelAtPeriodEnd: false,
    };
  }

  // An annual subscriber's included media accrues in 30-day windows rather
  // than all at once, so the current window is what is measured against.
  const windowStart = new Date(Math.max(
    subscription.currentPeriodStart.getTime(),
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ));
  const [used, creditBalance] = await Promise.all([
    includedUsedThisPeriod(user.id, windowStart),
    getCreditBalance(user.id),
  ]);

  return {
    planId: plan.id,
    plan,
    isGuest: false,
    hourlyTextLimit: plan.hourlyTextLimit,
    hourlyMediaLimit: plan.hourlyMediaLimit,
    includedRemaining: Math.max(0, plan.includedMediaCredits - used),
    creditBalance,
    periodEnd: subscription.currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
  };
}

/* -------------------------------------------------------------------------- */
/* Spending                                                                    */
/* -------------------------------------------------------------------------- */

export type MediaSpend =
  | { allowed: true; source: "included" | "credits" | "guest"; cost: number }
  | { allowed: false; reason: "guest_limit" | "no_credits"; cost: number };

/**
 * Decides whether a generation can be paid for, and from where.
 *
 * Included allowance is spent before purchased credits, always. Credits were
 * bought with real money and do not expire; the included allowance evaporates
 * at the end of the period whether or not it was used. Spending the perishable
 * one first is the only order that does not quietly take something from the
 * customer.
 */
export async function authoriseMediaSpend(input: {
  user: { id: number; openId: string };
  kind: "image" | "audio" | "video";
  /**
   * What this particular generation costs, when it differs from the kind's
   * base price — today only high-resolution images. Unset means the base
   * price; the override is computed by the caller, never by the customer.
   */
  costOverride?: number;
  now?: Date;
}): Promise<MediaSpend> {
  const cost = input.costOverride ?? MEDIA_CREDIT_COST[input.kind];
  const entitlements = await resolveEntitlements(input.user, input.now);

  if (entitlements.isGuest) {
    return { allowed: true, source: "guest", cost };
  }
  if (entitlements.includedRemaining >= cost) {
    return { allowed: true, source: "included", cost };
  }
  if (entitlements.creditBalance >= cost) {
    return { allowed: true, source: "credits", cost };
  }
  return { allowed: false, reason: "no_credits", cost };
}

/** Records a spend against the ledger, tied to what it produced. */
export async function recordMediaSpend(input: {
  userId: number;
  cost: number;
  mediaJobId?: number | null;
  note?: string;
}) {
  const db = await requireDb();
  await db.insert(creditLedger).values({
    userId: input.userId,
    delta: -Math.abs(input.cost),
    reason: "spend",
    mediaJobId: input.mediaJobId ?? null,
    note: input.note ?? null,
  });
}

/**
 * Returns what a generation cost when the provider later fails it.
 *
 * Charged at submission, refunded at failure — the customer should not pay for
 * work that never produced anything. Refunds exactly the spend entries tied to
 * the media job, once: a job that fails is polled past its failure more than
 * once, and each poll would otherwise refund again.
 */
export async function refundMediaSpendForJob(input: {
  userId: number;
  mediaJobId: number;
  note?: string;
}): Promise<{ refunded: boolean; credits: number }> {
  const db = await requireDb();
  const entries = await db.select({ delta: creditLedger.delta, reason: creditLedger.reason })
    .from(creditLedger)
    .where(and(eq(creditLedger.mediaJobId, input.mediaJobId), eq(creditLedger.userId, input.userId)));

  const charged = entries
    .filter(entry => entry.reason === "spend")
    .reduce((sum, entry) => sum + Math.abs(Number(entry.delta)), 0);
  if (!charged || entries.some(entry => entry.reason === "refund")) {
    return { refunded: false, credits: 0 };
  }

  await db.insert(creditLedger).values({
    userId: input.userId,
    delta: charged,
    reason: "refund",
    mediaJobId: input.mediaJobId,
    note: input.note ?? "generation_failed",
  });
  return { refunded: true, credits: charged };
}

/* -------------------------------------------------------------------------- */
/* Settlement                                                                  */
/* -------------------------------------------------------------------------- */

export type SettlementInput = {
  userId: number;
  /** `stripe`, `ccbill`, `btcpay`, `manual` — anything. Deliberately open. */
  provider: string;
  /** The provider's own identifier for this payment. Must be stable. */
  providerRef: string;
  kind: "subscription" | "credits";
  planId?: PlanId;
  credits?: number;
  amountCents: number;
  currency: string;
  now?: Date;
};

/**
 * Turns money that has arrived into something the customer can use.
 *
 * The one entry point for every rail. Card capture, crypto confirmation, and a
 * comp all land here, which is what keeps "what someone is entitled to" from
 * ever depending on who processed the payment.
 *
 * **Idempotent by `providerRef`.** Every payment provider delivers webhooks more
 * than once, and crypto processors do it more than most — a settled payment
 * re-notified after a reorg is normal, not exceptional. Granting twice for one
 * payment is the expensive direction of that mistake, so a repeat is a no-op.
 */
export async function settlePayment(input: SettlementInput) {
  const db = await requireDb();
  const now = input.now ?? new Date();

  const [existing] = await db.select().from(payments)
    .where(eq(payments.providerRef, input.providerRef)).limit(1);
  if (existing?.status === "settled") {
    return { granted: false, reason: "already_settled" as const, paymentId: existing.id };
  }

  if (existing) {
    await db.update(payments)
      .set({ status: "settled", settledAt: now })
      .where(eq(payments.id, existing.id));
  } else {
    await db.insert(payments).values({
      userId: input.userId,
      provider: input.provider,
      providerRef: input.providerRef,
      kind: input.kind,
      planId: input.planId ?? null,
      creditsGranted: input.credits ?? null,
      amountCents: input.amountCents,
      currency: input.currency,
      status: "settled",
      settledAt: now,
    });
  }

  const [payment] = await db.select().from(payments)
    .where(eq(payments.providerRef, input.providerRef)).limit(1);

  if (input.kind === "credits" && input.credits) {
    await db.insert(creditLedger).values({
      userId: input.userId,
      delta: Math.abs(input.credits),
      reason: "purchase",
      paymentId: payment?.id ?? null,
      note: `${input.provider} ${input.currency} ${(input.amountCents / 100).toFixed(2)}`,
    });
  }

  if (input.kind === "subscription" && input.planId) {
    const plan = PLANS[input.planId];
    const active = await getActiveSubscription(input.userId, now);
    // A renewal extends from where the paid period ends, not from today, so
    // paying early never costs the customer the days they already bought.
    const start = active ? active.currentPeriodEnd : now;
    const end = new Date(start.getTime() + plan.periodDays * 24 * 60 * 60 * 1000);

    if (active) {
      await db.update(subscriptions).set({
        planId: plan.id,
        status: "active",
        currentPeriodEnd: end,
        cancelAtPeriodEnd: false,
      }).where(eq(subscriptions.id, active.id));
    } else {
      await db.insert(subscriptions).values({
        userId: input.userId,
        planId: plan.id,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: end,
      });
    }
  }

  return { granted: true, paymentId: payment?.id ?? null };
}

/**
 * Cancels at the end of the paid period rather than immediately.
 *
 * Taking away what someone already paid for is how a cancellation becomes a
 * chargeback, and a chargeback counts against the ratio that decides whether
 * the payment rail survives. A refund is cheaper; keeping the service running
 * to the end of the period is cheaper still.
 */
export async function cancelSubscription(userId: number, now = new Date()) {
  const db = await requireDb();
  const active = await getActiveSubscription(userId, now);
  if (!active) return { cancelled: false };

  await db.update(subscriptions)
    .set({ cancelAtPeriodEnd: true })
    .where(eq(subscriptions.id, active.id));
  return { cancelled: true, activeUntil: active.currentPeriodEnd };
}

/** Reverses a settled payment: the money went back, so the credits do too. */
export async function reversePayment(input: { providerRef: string; disputed?: boolean }) {
  const db = await requireDb();
  const [payment] = await db.select().from(payments)
    .where(eq(payments.providerRef, input.providerRef)).limit(1);
  if (!payment || payment.status !== "settled") return { reversed: false };

  await db.update(payments)
    .set({ status: input.disputed ? "disputed" : "refunded" })
    .where(eq(payments.id, payment.id));

  if (payment.kind === "credits" && payment.creditsGranted) {
    // Allowed to go negative. A balance that cannot is one a customer can
    // empty and then charge back, which is the same trick twice.
    await db.insert(creditLedger).values({
      userId: payment.userId,
      delta: -Math.abs(payment.creditsGranted),
      reason: "refund",
      paymentId: payment.id,
      note: input.disputed ? "chargeback" : "refund",
    });
  }

  if (payment.kind === "subscription") {
    const active = await getActiveSubscription(payment.userId);
    if (active) {
      await db.update(subscriptions)
        .set({ status: input.disputed ? "cancelled" : "expired" })
        .where(eq(subscriptions.id, active.id));
    }
  }

  return { reversed: true };
}
