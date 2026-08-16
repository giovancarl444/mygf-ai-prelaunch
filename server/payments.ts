import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { payments } from "../drizzle/schema";
import { PLANS, type PlanId } from "./billing";
import { getDb } from "./db";

/**
 * Taking money: a hosted crypto checkout, with a log-mode fallback that makes
 * the whole funnel runnable before any processor account exists.
 *
 * The module owns providerRef allocation and the pending row; the grant itself
 * always goes through `settlePayment`, which is idempotent by providerRef — a
 * webhook delivered three times settles once. That seam is the reason a rail
 * swap is a new function here, not a change to billing.
 *
 * `log` is the deliberate default: exactly like EMAIL_PROVIDER=log, it is loud
 * about not being a production configuration.
 */

export type PaymentProvider = "log" | "nowpayments";

export type CheckoutInput = {
  userId: number;
  planId: Exclude<PlanId, "free">;
  /** Public origin for callback URLs. Falls back to the request host. */
  origin: string;
};

export type CheckoutSession = {
  provider: PaymentProvider;
  providerRef: string;
  checkoutUrl: string;
};

function config() {
  return {
    provider: (process.env.PAYMENTS_PROVIDER ?? "log").trim().toLowerCase() as PaymentProvider,
    apiKey: process.env.PAYMENTS_API_KEY?.trim() ?? "",
    ipnSecret: process.env.PAYMENTS_IPN_SECRET?.trim() ?? "",
    isProduction: process.env.NODE_ENV === "production",
  };
}

export function paymentsProvider(): PaymentProvider {
  const { provider } = config();
  return provider === "nowpayments" ? "nowpayments" : "log";
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable.");
  return db;
}

/** Where a webhook status lands. Pure so the mapping can be locked by tests. */
export function mapWebhookStatus(status: unknown): "settle" | "reverse" | "ignore" {
  if (typeof status !== "string") return "ignore";
  const normalized = status.toLowerCase();
  if (normalized === "finished" || normalized === "confirmed") return "settle";
  if (normalized === "refunded") return "reverse";
  return "ignore";
}

/**
 * NOWPayments signs the IPN body with HMAC-SHA512 over the JSON with keys
 * sorted recursively. We verify against the raw request body — never a
 * re-serialization of the parsed object, which can differ in spacing.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean {
  const { ipnSecret } = config();
  if (!ipnSecret || !signature) return false;
  const expected = createHmac("sha512", ipnSecret).update(rawBody, "utf8").digest("hex");
  const given = signature.trim().toLowerCase();
  if (given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given, "utf8"), Buffer.from(expected, "utf8"));
}

/** Computes the webhook signature the way the provider does — used by tests. */
export function signWebhookBody(rawBody: string): string {
  const { ipnSecret } = config();
  return createHmac("sha512", ipnSecret).update(rawBody, "utf8").digest("hex");
}

/**
 * Creates a checkout and its pending payment row. The providerRef is ours and
 * stable across the whole payment's life: the hosted page carries it as
 * order_id, the webhook echoes it back, and settlePayment keys on it.
 */
export async function createCheckout(input: CheckoutInput): Promise<CheckoutSession> {
  const plan = PLANS[input.planId];
  if (!plan || plan.priceCents <= 0) throw new Error(`Plan ${input.planId} is not purchasable.`);

  const { provider, apiKey, isProduction } = config();
  const rail: PaymentProvider = provider === "nowpayments" && apiKey ? "nowpayments" : "log";
  const providerRef = `${rail === "log" ? "log" : "np"}-${randomBytes(16).toString("hex")}`;
  const origin = input.origin.replace(/\/$/, "");

  if (rail === "log") {
    if (isProduction) {
      throw new Error("PAYMENTS_PROVIDER=log cannot take money in production. Configure a real rail.");
    }
    await (await requireDb()).insert(payments).values({
      userId: input.userId,
      provider: "log",
      providerRef,
      kind: "subscription",
      planId: input.planId,
      amountCents: plan.priceCents,
      currency: "USD",
      status: "pending",
    });
    console.warn(
      "[Payments] log mode — checkout for user %s, plan %s (%s cents). Confirm at %s",
      input.userId, input.planId, plan.priceCents, `${origin}/api/payments/dev-confirm?ref=${providerRef}`,
    );
    return { provider: "log", providerRef, checkoutUrl: `${origin}/api/payments/dev-confirm?ref=${providerRef}` };
  }

  const response = await fetch("https://api.nowpayments.io/v1/invoice", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({
      price_amount: plan.priceCents / 100,
      price_currency: "usd",
      order_id: providerRef,
      success_url: `${origin}/pricing?paid=1`,
      ipn_callback_url: `${origin}/api/payments/webhook`,
    }),
  });

  if (!response.ok) {
    // The pending row records the attempt; a failed checkout is retried with a
    // fresh providerRef rather than resurrecting this one.
    await (await requireDb()).insert(payments).values({
      userId: input.userId,
      provider: "nowpayments",
      providerRef,
      kind: "subscription",
      planId: input.planId,
      amountCents: plan.priceCents,
      currency: "USD",
      status: "failed",
    });
    throw new Error(`Checkout provider responded ${response.status}.`);
  }

  const invoice = await response.json() as { invoice_url?: string };
  if (!invoice.invoice_url) throw new Error("Checkout provider returned no invoice_url.");

  await (await requireDb()).insert(payments).values({
    userId: input.userId,
    provider: "nowpayments",
    providerRef,
    kind: "subscription",
    planId: input.planId,
    amountCents: plan.priceCents,
    currency: "USD",
    status: "pending",
  });

  return { provider: "nowpayments", providerRef, checkoutUrl: invoice.invoice_url };
}

export type PendingCheckoutRow = {
  userId: number;
  provider: string;
  providerRef: string;
  kind: "subscription" | "credits";
  planId: string | null;
  amountCents: number;
  currency: string;
  status: string;
};

/** The webhook's source of truth: what this providerRef was for, and for whom. */
export async function findPaymentByRef(providerRef: string): Promise<PendingCheckoutRow | null> {
  const rows = await (await requireDb())
    .select()
    .from(payments)
    .where(eq(payments.providerRef, providerRef))
    .limit(1);
  const row = rows[0];
  return row ?? null;
}
