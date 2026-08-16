import type { Express } from "express";
import { reversePayment, settlePayment } from "./billing";
import { findPaymentByRef, mapWebhookStatus, paymentsProvider, verifyWebhookSignature } from "./payments";

/**
 * The two payment routes that cannot be tRPC procedures: the webhook is called
 * by the processor (no session), and dev-confirm is a browser redirect target.
 *
 * The webhook answers 200 to unknown refs and uninteresting statuses so the
 * provider stops retrying — a 4xx storm from us would only ever produce the
 * same decision again.
 */
export function registerPaymentRoutes(app: Express) {
  app.post("/api/payments/webhook", async (req, res) => {
    const rawBody = (req as { rawBody?: Buffer }).rawBody?.toString("utf8") ?? "";
    const signature = req.header("x-nowpayments-sig");

    if (!verifyWebhookSignature(rawBody, signature)) {
      res.status(401).json({ error: "invalid signature" });
      return;
    }

    const body = req.body as { order_id?: unknown; payment_status?: unknown };
    const providerRef = typeof body.order_id === "string" ? body.order_id : "";
    if (!providerRef) {
      res.status(400).json({ error: "missing order_id" });
      return;
    }

    const row = await findPaymentByRef(providerRef);
    if (!row) {
      // Unknown to us but correctly signed: acknowledge and move on.
      res.json({ processed: false, reason: "unknown_ref" });
      return;
    }

    const action = mapWebhookStatus(body.payment_status);
    if (action === "settle") {
      await settlePayment({
        userId: row.userId,
        provider: row.provider,
        providerRef,
        kind: "subscription",
        planId: row.planId as "premium" | "premium_annual",
        amountCents: row.amountCents,
        currency: row.currency,
      });
    } else if (action === "reverse") {
      await reversePayment({ providerRef });
    }

    res.json({ processed: true, action });
  });

  // Log-mode only, and never in production: the URL returned by createCheckout
  // in development, so the whole funnel is walkable without a processor.
  app.get("/api/payments/dev-confirm", async (req, res) => {
    if (paymentsProvider() !== "log" || process.env.NODE_ENV === "production") {
      res.status(404).end();
      return;
    }
    const providerRef = typeof req.query.ref === "string" ? req.query.ref : "";
    const row = providerRef ? await findPaymentByRef(providerRef) : null;
    if (!row || row.status !== "pending") {
      res.redirect("/pricing?paid=0");
      return;
    }

    await settlePayment({
      userId: row.userId,
      provider: row.provider,
      providerRef,
      kind: "subscription",
      planId: row.planId as "premium" | "premium_annual",
      amountCents: row.amountCents,
      currency: row.currency,
    });
    res.redirect("/pricing?paid=1");
  });
}
