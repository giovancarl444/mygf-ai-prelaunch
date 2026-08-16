import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A fake store, because the arithmetic is the thing under test and a real
 * database would only make the failures slower to read.
 */
const store = vi.hoisted(() => ({
  ledger: [] as { userId: number; delta: number; reason: string; createdAt: Date }[],
  payments: [] as Record<string, unknown>[],
  subscriptions: [] as Record<string, unknown>[],
  nextId: 1,
}));

vi.mock("./db", async () => {
  const { getTableName } = await import("drizzle-orm");
  const matches = (row: Record<string, unknown>, filters: Record<string, unknown>) =>
    Object.entries(filters).every(([key, value]) => row[key] === value);
  const nameOf = (table: unknown) => getTableName(table as never);

  return {
    getDb: vi.fn(async () => ({
      select: (columns?: Record<string, unknown>) => ({
        from: (table: unknown) => {
          const name = nameOf(table);
          const builder = {
            where: (filters: Record<string, unknown> = {}) => {
              const rows = name === "credit_ledger" ? store.ledger
                : name === "payments" ? store.payments
                  : store.subscriptions;
              const selected = (rows as Record<string, unknown>[]).filter(row => matches(row, filters));
              const result = columns && ("balance" in columns || "total" in columns)
                ? [{ balance: selected.reduce((sum, row) => sum + Number(row.delta ?? 0), 0),
                     total: selected.reduce((sum, row) => sum + Number(row.delta ?? 0), 0) }]
                : selected;
              return Object.assign(Promise.resolve(result), {
                limit: async () => result.slice(0, 1),
                orderBy: () => ({ limit: async () => result.slice(0, 1) }),
              });
            },
          };
          return builder;
        },
      }),
      insert: (table: unknown) => ({
        values: async (row: Record<string, unknown>) => {
          const name = nameOf(table);
          const withId = { id: store.nextId++, createdAt: new Date(), ...row };
          if (name === "credit_ledger") store.ledger.push(withId as never);
          else if (name === "payments") store.payments.push(withId);
          else store.subscriptions.push(withId);
        },
      }),
      update: (table: unknown) => ({
        set: (patch: Record<string, unknown>) => ({
          where: async (filters: Record<string, unknown> = {}) => {
            const name = nameOf(table);
            const rows = name === "payments" ? store.payments : store.subscriptions;
            for (const row of rows) if (matches(row, filters)) Object.assign(row, patch);
          },
        }),
      }),
    })),
  };
});

// Drizzle's operators are replaced with plain filter objects so the fake can
// read them. Only the shapes this module builds are supported.
vi.mock("drizzle-orm", async importOriginal => {
  const original = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...original,
    and: (...parts: Record<string, unknown>[]) => Object.assign({}, ...parts.filter(Boolean)),
    eq: (column: { name: string }, value: unknown) => ({ [column.name]: value }),
    gt: () => ({}),
    desc: (column: unknown) => column,
    sql: Object.assign(() => ({}), { raw: () => ({}) }),
  };
});

import {
  authoriseMediaSpend,
  cancelSubscription,
  getCreditBalance,
  MEDIA_CREDIT_COST,
  PLANS,
  recordMediaSpend,
  refundMediaSpendForJob,
  reversePayment,
  settlePayment,
} from "./billing";

const member = { id: 7, openId: "member" };
const guest = { id: 42, openId: "guest:abc" };

beforeEach(() => {
  store.ledger = [];
  store.payments = [];
  store.subscriptions = [];
  store.nextId = 1;
});

describe("what a plan is worth", () => {
  it("prices the annual plan below twelve months of monthly", () => {
    expect(PLANS.premium_annual.priceCents).toBeLessThan(PLANS.premium.priceCents * 12);
  });

  /**
   * A year of included media handed over on day one is a year of provider cost
   * exposed to a day-two refund.
   */
  it("does not front-load a year of included media", () => {
    expect(PLANS.premium_annual.includedMediaCredits).toBe(PLANS.premium.includedMediaCredits);
  });

  it("charges more for the generation that costs more", () => {
    expect(MEDIA_CREDIT_COST.video).toBeGreaterThan(MEDIA_CREDIT_COST.image);
  });

  it("gives the free plan no media at all", () => {
    expect(PLANS.free.hourlyMediaLimit).toBe(0);
    expect(PLANS.free.includedMediaCredits).toBe(0);
  });
});

describe("settling money from any rail", () => {
  it("grants credits for a card payment", async () => {
    await settlePayment({
      userId: member.id, provider: "stripe", providerRef: "pi_1",
      kind: "credits", credits: 100, amountCents: 999, currency: "usd",
    });
    expect(await getCreditBalance(member.id)).toBe(100);
  });

  /**
   * The rail is not supposed to matter. A crypto settlement differs in when it
   * is called — on confirmations rather than an authorisation — not in what it
   * grants.
   */
  it("grants identically for a crypto settlement", async () => {
    await settlePayment({
      userId: member.id, provider: "btcpay", providerRef: "invoice_9",
      kind: "credits", credits: 100, amountCents: 999, currency: "usd",
    });
    expect(await getCreditBalance(member.id)).toBe(100);
    expect(store.payments[0].provider).toBe("btcpay");
  });

  /**
   * Every provider delivers a webhook more than once, and crypto processors do
   * it more than most. Granting twice is the expensive direction.
   */
  it("grants once however many times the webhook arrives", async () => {
    const payment = {
      userId: member.id, provider: "btcpay", providerRef: "invoice_9",
      kind: "credits" as const, credits: 100, amountCents: 999, currency: "usd",
    };
    await settlePayment(payment);
    const second = await settlePayment(payment);
    const third = await settlePayment(payment);

    expect(await getCreditBalance(member.id)).toBe(100);
    expect(second.granted).toBe(false);
    expect(third.granted).toBe(false);
  });

  it("starts a subscription and dates its period from the plan", async () => {
    const now = new Date("2026-08-15T00:00:00Z");
    await settlePayment({
      userId: member.id, provider: "ccbill", providerRef: "sub_1",
      kind: "subscription", planId: "premium", amountCents: 1499, currency: "usd", now,
    });

    const [subscription] = store.subscriptions;
    expect(subscription.planId).toBe("premium");
    expect((subscription.currentPeriodEnd as Date).toISOString().slice(0, 10)).toBe("2026-09-14");
  });
});

describe("paying for a generation", () => {
  it("spends the included allowance before purchased credits", async () => {
    const now = new Date("2026-08-15T12:00:00Z");
    await settlePayment({
      userId: member.id, provider: "stripe", providerRef: "sub_2",
      kind: "subscription", planId: "premium", amountCents: 1499, currency: "usd", now,
    });
    await settlePayment({
      userId: member.id, provider: "stripe", providerRef: "pi_2",
      kind: "credits", credits: 50, amountCents: 999, currency: "usd",
    });

    const spend = await authoriseMediaSpend({ user: member, kind: "image", now });
    expect(spend).toMatchObject({ allowed: true, source: "included" });
  });

  /**
   * Credits were bought with real money and never expire; the included
   * allowance evaporates at the end of the period whether or not it is used.
   * Spending the perishable one first is the only order that does not quietly
   * take something from the customer.
   */
  it("falls through to credits once the included allowance is gone", async () => {
    const now = new Date("2026-08-15T12:00:00Z");
    await settlePayment({
      userId: member.id, provider: "stripe", providerRef: "sub_3",
      kind: "subscription", planId: "premium", amountCents: 1499, currency: "usd", now,
    });
    await settlePayment({
      userId: member.id, provider: "stripe", providerRef: "pi_3",
      kind: "credits", credits: 50, amountCents: 999, currency: "usd",
    });

    for (let i = 0; i < PLANS.premium.includedMediaCredits; i += 1) {
      await recordMediaSpend({ userId: member.id, cost: 1 });
    }

    const spend = await authoriseMediaSpend({ user: member, kind: "image", now });
    expect(spend).toMatchObject({ allowed: true, source: "credits" });
  });

  it("refuses when there is nothing left to spend", async () => {
    const spend = await authoriseMediaSpend({ user: member, kind: "image" });
    expect(spend).toMatchObject({ allowed: false, reason: "no_credits" });
  });

  it("refuses a video the balance cannot cover even when an image would pass", async () => {
    await settlePayment({
      userId: member.id, provider: "stripe", providerRef: "pi_4",
      kind: "credits", credits: 3, amountCents: 199, currency: "usd",
    });

    expect(await authoriseMediaSpend({ user: member, kind: "image" })).toMatchObject({ allowed: true });
    expect(await authoriseMediaSpend({ user: member, kind: "video" })).toMatchObject({ allowed: false });
  });

  it("leaves guests to the trial rules rather than the ledger", async () => {
    const spend = await authoriseMediaSpend({ user: guest, kind: "image" });
    expect(spend).toMatchObject({ allowed: true, source: "guest" });
  });
});

describe("money going back out", () => {
  /**
   * Taking away what someone already paid for is how a cancellation becomes a
   * chargeback, and a chargeback counts against the ratio that decides whether
   * the payment rail survives at all.
   */
  it("cancels at the end of the paid period, not immediately", async () => {
    const now = new Date("2026-08-15T00:00:00Z");
    await settlePayment({
      userId: member.id, provider: "stripe", providerRef: "sub_4",
      kind: "subscription", planId: "premium", amountCents: 1499, currency: "usd", now,
    });

    const result = await cancelSubscription(member.id, now);
    expect(result.cancelled).toBe(true);
    expect(store.subscriptions[0].cancelAtPeriodEnd).toBe(true);
    expect(store.subscriptions[0].status).toBe("active");
  });

  it("takes the credits back when the money goes back", async () => {
    await settlePayment({
      userId: member.id, provider: "stripe", providerRef: "pi_5",
      kind: "credits", credits: 100, amountCents: 999, currency: "usd",
    });
    await reversePayment({ providerRef: "pi_5" });

    expect(await getCreditBalance(member.id)).toBe(0);
    expect(store.payments[0].status).toBe("refunded");
  });

  /**
   * A balance that cannot go negative is one a customer can empty and then
   * charge back — the same trick twice, for free.
   */
  it("lets a balance go negative after a chargeback on spent credits", async () => {
    await settlePayment({
      userId: member.id, provider: "stripe", providerRef: "pi_6",
      kind: "credits", credits: 100, amountCents: 999, currency: "usd",
    });
    await recordMediaSpend({ userId: member.id, cost: 60 });
    await reversePayment({ providerRef: "pi_6", disputed: true });

    expect(await getCreditBalance(member.id)).toBe(-60);
    expect(store.payments[0].status).toBe("disputed");
  });

  it("ignores a reversal for a payment that never settled", async () => {
    expect(await reversePayment({ providerRef: "unknown" })).toEqual({ reversed: false });
  });
});

describe("generation pricing and failure refunds", () => {
  /**
   * High-resolution images cost double (verified live 16 Aug 2026: explicit
   * sizes are honoured where presets are capped). The override is the caller's
   * arithmetic — a customer never names a price.
   */
  it("authorises and charges a cost override at its own price", async () => {
    store.ledger.push({ userId: member.id, delta: 10, reason: "purchase", createdAt: new Date() } as never);

    const spend = await authoriseMediaSpend({ user: member, kind: "image", costOverride: 2 });
    expect(spend).toMatchObject({ allowed: true, cost: 2 });

    await recordMediaSpend({ userId: member.id, cost: spend.cost, mediaJobId: 55, note: spend.source });
    expect(store.ledger.at(-1)).toMatchObject({ userId: member.id, delta: -2, reason: "spend", mediaJobId: 55 });
    expect(await getCreditBalance(member.id)).toBe(8);
  });

  it("falls back to the kind's base price when no override is given", async () => {
    store.ledger.push({ userId: member.id, delta: 10, reason: "purchase", createdAt: new Date() } as never);
    const spend = await authoriseMediaSpend({ user: member, kind: "image" });
    expect(spend.cost).toBe(MEDIA_CREDIT_COST.image);
  });

  /**
   * Charged at submission, refunded when the provider later fails the job —
   * once, no matter how many times the failure is polled past.
   */
  it("refunds exactly the spend entries tied to a failed job, once", async () => {
    await recordMediaSpend({ userId: member.id, cost: 2, mediaJobId: 77, note: "credits" });

    const first = await refundMediaSpendForJob({ userId: member.id, mediaJobId: 77 });
    expect(first).toEqual({ refunded: true, credits: 2 });

    const second = await refundMediaSpendForJob({ userId: member.id, mediaJobId: 77 });
    expect(second).toEqual({ refunded: false, credits: 0 });

    expect(await getCreditBalance(member.id)).toBe(0);
    expect(store.ledger.filter(entry => entry.reason === "refund")).toHaveLength(1);
  });

  it("does not refund a job that was never charged", async () => {
    expect(await refundMediaSpendForJob({ userId: member.id, mediaJobId: 999 }))
      .toEqual({ refunded: false, credits: 0 });
  });
});
