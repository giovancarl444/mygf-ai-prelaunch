# How MyGF.ai makes money

The plan, the arithmetic behind it, and the reasons for each decision. Written
down because pricing drifts when nobody can remember why a number was chosen,
and because the numbers here are wrong in a specific, knowable way that a single
measurement will fix.

**Status: the structure is built, no money can be taken yet.** `server/billing.ts`
holds plans, entitlements, and settlement. No payment provider is integrated.

---

## 1. The structure: subscription plus consumables

**Subscription for access and conversation. Consumable credits for media.**

This is forced by the cost curve, not chosen for taste. Text is cheap and
roughly flat per customer, so a fixed price absorbs it. Images and video are
expensive and **unbounded per customer**, so they cannot be.

Either extreme fails:

- **Subscription with unlimited media** — the heaviest few per cent consume the
  margin of everyone else. In a category where usage is this skewed, that is not
  a tail risk, it is the median outcome.
- **Pay-per-generation only** — no recurring revenue, no retention, and every
  session starts with a purchase decision.

There is a second reason, and it is the larger one. **Revenue in this category
concentrates in a small cohort.** A flat $14.99 with unlimited media caps
revenue at $14.99 from someone who would happily spend $200 a month. Credit
packs exist to serve that customer rather than throttle them. Getting this wrong
is the most expensive available mistake, and it is a pricing decision — no
amount of product work recovers it.

## 2. Plans

Defined in `PLANS` in `server/billing.ts`. Code, not database: changing what
someone gets for their money should take a review and a deploy, not an `UPDATE`.

| Plan | Price | Text/hour | Media/hour | Included media credits |
| --- | --- | --- | --- | --- |
| Guest | free | 3 messages *total* | 1 generation *total* | — |
| Free | free | 20 | 0 | 0 |
| Premium | $14.99/mo | 120 | 20 | 40 per 30 days |
| Premium annual | $83.88/yr | 120 | 20 | 40 per 30 days |

$14.99 sits mid-band against the category's $10–25 revenue per payer: above the
$9.99 floor that selects for churn-prone buyers, below $19.99, which needs proof
this product does not yet have.

The annual plan grants its included media **per 30-day window, not 480 up
front**. A year's allowance handed over on day one is a year of provider cost
exposed to a day-two refund.

The free tier gets conversation and no media at all. Media is the entire
variable cost; giving it away without a card on file is how a free tier becomes
a bill.

### Credit packs

Sold in **our** credit units, never the provider's. Their pricing is an
implementation detail, and publishing it would both disclose our margin and tie
our price list to someone else's decisions.

| Generation | Our credits |
| --- | --- |
| Photo | 1 |
| Voice note | 1 |
| Video | 10 |

Packs at $9.99 / $24.99 / $49.99, with more credits per dollar at each step.
**Credits never expire.** An expiring balance is a customer-service queue and a
chargeback generator, and it buys nothing that a sensible pack size does not.

## 3. Margin, and the one number still missing

Provider cost is **$0.01 per OhAPI credit** — derived from their published
plans, where $4,999 buys 550,000 credits including a stated 10% bonus, and
$9,999 buys 1,200,000 including 20%. Both resolve to the same base rate.

**Credits per generation is not published.** It appears nowhere in their OpenAPI
specification. It is the number that decides whether this business works.

Budget **30% of subscription revenue** for provider cost. That sets the included
allowance:

> **included photos = (0.30 × price) ÷ (credits per image × $0.01)**

At $14.99:

| Provider credits per image | Cost of 40 included | Gross margin | Action |
| --- | --- | --- | --- |
| 10 | $4.00 | 73% | Raise included to ~45 |
| 25 | $10.00 | 33% | Cut included to ~18 |
| 50 | $20.00 | negative | Media becomes pack-only |

The same arithmetic decides video. At 100 credits a clip it costs $1.00, belongs
in packs exclusively, and should never be included in a subscription.

**`includedMediaCredits = 40` is a placeholder chosen to be survivable at every
plausible value, not a considered number.** Revisit it the moment the
measurement exists. The test that produces it takes about 400 credits and is
described in the deploy notes: record the balance, run five messages, one image,
a second image, one voice note, one video, and one image at a different
resolution, reading the balance between each.

## 4. Payments

### Cards

| | |
| --- | --- |
| Processing | 4–8% plus per-transaction, against ~2.9% mainstream |
| Rolling reserve | 5–10%, held 90–180 days |
| Chargebacks | Structurally high — people dispute what they do not want on a statement |

Budget **~10% of revenue** to payments. Stripe, PayPal, and Square all prohibit
adult AI in their restricted-business policies and terminate on review, so this
means a high-risk merchant account and stricter underwriting.

Understand the reserve correctly: it is a **cashflow** cost, not a P&L cost. The
first months of revenue are partly withheld. Selling annual plans into a rolling
reserve means collecting twelve months of revenue, having a slice held back, and
carrying twelve months of refund exposure against it — a combination that has
ended solvent businesses.

### Crypto

**Structurally better for this product, and worth having from day one.**

- **No chargebacks.** Settlement is final. This removes the single largest
  threat to the payment rail, because chargeback ratio is what gets a merchant
  account closed.
- **No rolling reserve**, so no withheld cashflow.
- **~1% fees** against 4–8%.
- **No morality clause.** Nobody reviews the business and decides against it.

Against that: a minority of customers will use it, prices move between quote and
confirmation, refunds are manual, and depending on volume and jurisdiction there
are registration obligations worth taking advice on before scale.

Two routes:

- **BTCPay Server, self-hosted.** No third party, therefore nothing to be
  deplatformed from — the same reasoning that put this product on a droplet
  rather than a platform. Costs operational attention.
- **A hosted adult-friendly processor** (NOWPayments, CoinPayments). Faster to
  start, reintroduces a counterparty.

Start hosted if it gets money moving sooner; the settlement seam means moving to
BTCPay later is a new function, not a migration.

**Crypto is not a fallback for when cards are declined.** It is the rail with
the best economics and the least existential risk, and it should be presented as
a first-class option — with a discount if that is what it takes, since it costs
7 points less to accept.

### Why the code does not care which

`settlePayment` in `server/billing.ts` is the single entry point for every rail.
Card capture, crypto confirmation, and a manually comped account all call it and
all grant identically. Entitlements never learn how anyone paid.

This is the load-bearing decision in the billing code. In this category the
payment rail is the component most likely to be removed without notice, and this
shape makes replacing it a new function rather than a rewrite. It is also why
adding crypto is small: it settles differently — on confirmations rather than an
authorisation — but it grants the same.

Settlement is **idempotent by `providerRef`**. Every provider delivers webhooks
more than once and crypto processors do it more than most; a payment re-notified
after a chain reorganisation is routine. Granting twice is the expensive
direction of that mistake.

### Chargeback defence, cheapest first

1. **A billing descriptor the customer recognises.** The largest single cause of
   "I did not buy this" is a descriptor nobody recognises. Free to get right.
2. **Refund fast, do not fight.** A refund does not count against the ratio; a
   chargeback does. Refunding a $14.99 dispute is strictly cheaper than winning
   it.
3. **One-click self-serve cancellation.** Hard cancellation manufactures
   chargebacks, and in several target markets it is now legally required anyway.
   `cancelSubscription` ends the plan at the period boundary rather than
   immediately — taking away what someone already paid for is exactly how a
   cancellation becomes a dispute.
4. **A receipt on every charge**, through the sender that already exists for
   sign-in links.

A chargeback on spent credits is allowed to drive the balance negative. A
balance that cannot go negative is one a customer can empty and then charge
back — the same trick twice, at no cost.

## 5. The funnel

Illustrative. These are assumptions, and instrumenting them is why analytics
ships **before** billing: launching payments blind makes a pricing problem and a
funnel problem indistinguishable.

```
10,000 organic visitors / month
  × 25% start a guest conversation   →  2,500
  ×  8% convert to paid              →    200 payers
  × $14.99                           →  $2,998 MRR
```

Category figures worth holding alongside: about 45% twelve-month retention among
**paying** users against 25% overall, CAC of $8–25 per payer on
NSFW-permissive channels, LTV of $180–500.

**This only works on organic traffic.** Paid adult inventory pushes CAC past the
point those retention numbers rescue. Apple, Google, and Meta are closed to this
category, which is why search is the strategic asset rather than a channel.

## 6. What exists and what does not

**Built** — `server/billing.ts`, `drizzle/schema.ts` (`subscriptions`,
`credit_ledger`, `payments`), migration `0011`, enforcement inside
`submitMediaJob`.

- Plans, prices, and per-generation costs in one place
- Entitlement resolution for guest, free, and paying accounts
- An append-only credit ledger; a balance is the sum of it and is never a stored
  column, so "where did my credits go" has an ordered, immutable answer with the
  generation that spent each one still attached
- Included allowance is spent before purchased credits, always — the included
  one perishes at the period boundary and the purchased one does not, so any
  other order quietly takes something from the customer
- Settlement, cancellation, refund, and chargeback handling

**Not built**

1. A payment provider — nothing can be charged
2. Checkout and webhook endpoints
3. Self-serve cancellation in the interface
4. Receipts
5. Funnel analytics — **ships before billing**

## 7. Order of work

| When | What |
| --- | --- |
| Now | Two card processors applied for in parallel. One crypto route chosen. The credit measurement run. |
| Week 1–2 | Analytics. Deploy and verify. |
| Week 2–3 | Provider integration behind a flag. Cancellation. Receipts. |
| Week 3–4 | Set `includedMediaCredits` from the measurement. Open it. |

Underwriting is the long pole and cannot be compressed. Everything else fits
inside it.

## 8. Open questions

- **Credits per image, video, voice note, and message.** Everything in section 3
  depends on it.
- **Does resolution change the price?** The product requests 9:16 (720×1280) by
  default. If output size is billed, that default has a monthly invoice attached.
- **Is the API key enabled for adult content?** Explicit generation requires it,
  and a large part of the product depends on the answer.
- **Are generated characters exclusive to this account?** The API scopes them by
  `b2bClientId`, which suggests yes. Worth having in writing before investing in
  a roster, because the answer decides whether character work is an asset or a
  gift to competitors.
