import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The payment rail, without a processor: signature verification, status
 * mapping, and the pending row checkout creates. The grant arithmetic is
 * already locked in billing.test.ts — including webhook double-delivery
 * settling once — so these tests cover only what this module adds.
 */
const store = vi.hoisted(() => ({
  payments: [] as Record<string, unknown>[],
}));

vi.mock("./db", async () => {
  const { getTableName } = await import("drizzle-orm");
  const matches = (row: Record<string, unknown>, filters: Record<string, unknown>) =>
    Object.entries(filters).every(([key, value]) => row[key] === value);
  return {
    getDb: vi.fn(async () => ({
      insert: (table: unknown) => ({
        values: async (row: Record<string, unknown>) => {
          if (getTableName(table as never) === "payments") store.payments.push(row);
        },
      }),
      select: () => ({
        from: (table: unknown) => {
          if (getTableName(table as never) !== "payments") return { where: () => ({ limit: async () => [] }) };
          return {
            where: (filters: Record<string, unknown>) => ({
              limit: async () => store.payments.filter(row => matches(row, filters)).slice(0, 1),
            }),
          };
        },
      }),
    })),
  };
});

vi.mock("drizzle-orm", async importOriginal => {
  const original = await importOriginal<typeof import("drizzle-orm")>();
  return { ...original, eq: (column: { name: string }, value: unknown) => ({ [column.name]: value }) };
});

import { createCheckout, findPaymentByRef, mapWebhookStatus, signWebhookBody, verifyWebhookSignature } from "./payments";

const originalEnv = { ...process.env };

beforeEach(() => {
  store.payments = [];
  process.env.PAYMENTS_PROVIDER = "log";
  delete process.env.PAYMENTS_API_KEY;
  delete process.env.PAYMENTS_IPN_SECRET;
  delete process.env.NODE_ENV;
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("webhook signature", () => {
  it("accepts the provider's signature over the raw body", () => {
    process.env.PAYMENTS_IPN_SECRET = "sekrit";
    const body = JSON.stringify({ payment_status: "finished", order_id: "np-abc" });
    expect(verifyWebhookSignature(body, signWebhookBody(body))).toBe(true);
  });

  it("rejects a signature computed over different bytes", () => {
    process.env.PAYMENTS_IPN_SECRET = "sekrit";
    const signature = signWebhookBody(JSON.stringify({ order_id: "np-abc" }));
    expect(verifyWebhookSignature(JSON.stringify({ order_id: "np-xyz" }), signature)).toBe(false);
  });

  it("rejects everything when no secret is configured", () => {
    const body = "{}";
    expect(verifyWebhookSignature(body, "deadbeef")).toBe(false);
  });
});

describe("webhook status mapping", () => {
  it("settles only on confirmed money", () => {
    expect(mapWebhookStatus("finished")).toBe("settle");
    expect(mapWebhookStatus("confirmed")).toBe("settle");
    expect(mapWebhookStatus("refunded")).toBe("reverse");
  });

  it("ignores in-flight and unknown statuses", () => {
    expect(mapWebhookStatus("waiting")).toBe("ignore");
    expect(mapWebhookStatus("confirming")).toBe("ignore");
    expect(mapWebhookStatus("sending")).toBe("ignore");
    expect(mapWebhookStatus("partially_paid")).toBe("ignore");
    expect(mapWebhookStatus(undefined)).toBe("ignore");
    expect(mapWebhookStatus(42)).toBe("ignore");
  });
});

describe("log-mode checkout", () => {
  it("creates a pending row and a dev-confirm URL", async () => {
    const session = await createCheckout({ userId: 7, planId: "premium", origin: "http://localhost:3000/" });

    expect(session.provider).toBe("log");
    expect(session.providerRef).toMatch(/^log-/);
    expect(session.checkoutUrl).toContain(`/api/payments/dev-confirm?ref=${session.providerRef}`);

    expect(store.payments).toHaveLength(1);
    expect(store.payments[0]).toMatchObject({
      userId: 7,
      provider: "log",
      providerRef: session.providerRef,
      kind: "subscription",
      planId: "premium",
      amountCents: 1499,
      currency: "USD",
      status: "pending",
    });
    expect(await findPaymentByRef(session.providerRef)).toMatchObject({ userId: 7, planId: "premium" });
  });

  it("refuses to take log-mode money in production", async () => {
    process.env.NODE_ENV = "production";
    await expect(
      createCheckout({ userId: 7, planId: "premium", origin: "http://localhost:3000" }),
    ).rejects.toThrow(/log/);
  });

  it("refuses the free plan", async () => {
    await expect(
      createCheckout({ userId: 7, planId: "free", origin: "http://localhost:3000" }),
    ).rejects.toThrow(/not purchasable/);
  });
});
