# Architecture — the one product and its satellites

Written 16 August 2026, when the scattered funnel was brought under one roof.
Read `CLAUDE.md` first for the provider rules; this file is the map of what
exists where, and what is deliberately is not this repository.

## Decision that shaped everything

**MyGF.ai lives here, in full.** The visual design language comes from the
`candy-ai-site` prototype and is ported *into* this repository rather than
wired up as a second deployed app. One product, one repo, one deploy, one
auth session, one billing ledger. The prototype repos stay as sources and
tools, never as production dependencies.

## Repository roles

| Repository | Role | Rule |
| --- | --- | --- |
| `mygf-ai-prelaunch` (this repo) | **The product.** Client, server, database, deploy. | Everything customer-facing ships from here. |
| `candy-ai-site` | Design source. Editorial "Discover" look (banner, catalogue, profile, collection). | Design reference only. No code links to it; assets and pages are ported, adapted to real data. |
| `ohapi-playground` | Internal API test bench (browser-direct, visitor's own key). | Never linked publicly. A copy also lives at `tools/oh-api-playground` guarded by `server/playgroundIsolation.test.ts`. |

## The funnel, stage by stage

1. **Landing** (`/`) — banner, catalogue preview, product principles.
2. **Discovery** (`/companions`) — searchable catalogue from the provider
   library (`companions.list`). A card that cannot be opened never appears.
3. **Profile** (`/companion/:slug`) — one companion, her identity in the URL,
   "start a chat" carries the slug.
4. **Guest chat** (`/chat/:slug`) — a taste of the conversation with server
   rate limits (3 messages, 1 generation) before any account exists.
5. **Adult confirmation** — enforced server-side (`chat.confirmAdult`);
   the browser only presents the state.
6. **Sign-in** (`/signin`) — e-mail magic links, hashed single-use tokens.
7. **Full chat with media** — text, photos, video, voice notes via the
   media router; credits are debited before provider resources are created.
8. **Billing** — `creditLedger` (append-only), `payments` (idempotent by
   `providerRef`), `subscriptions` (free / premium $14.99 / annual $83.88).
   **No payment rail is connected yet** — the models exist, nothing calls
   `settlePayment`. This is the biggest deliberate gap.

## Provider (OhAPI) — what is verified

`server/ohapi.ts` is the only code that talks to `api.oh.xyz`, locked by
`server/ohapiContract.test.ts`. The vendored spec is
`docs/ohapi-openapi.json`; `docs/OHAPI_REFERENCE.md` documents all 64
operations. `CLAUDE.md` lists where the published documentation lies.

Findings from the 16 August live test session (partner key, character
"Juliana Nilsson" CID 21706) worth remembering:

- **Explicit `[width, height]` resolutions are honored.** `resolution:
  [1080, 1920]` returned real 1080×1920 output while aspect-ratio presets
  ("9:16") lock at 720×1280. Not in the published docs. Cost per credit
  unverified — confirm with the provider before making it a default.
- **`POST /api/v1/images` without enhancement is ~32 s; with
  `prompt_enhancement: true` ~48–52 s.** Raw prompts outperformed enhanced
  ones in side-by-side ranking; the winning recipe was a structured prompt
  (camera + pose + outfit + location + light), enhancement off.
- **Voice is synchronous**: `POST /api/v1/audio/notes` answers `200 {url}`
  in ~9 s and requires `room_id`; the text field is named `prompt` (the
  wrapper sends both `prompt` and `text` defensively).
- **Adult content permissions were confirmed enabled** for the partner key
  across a five-tier prompt gradient — zero 400 moderation hits.
- **Generated media links live ~7 days**, portrait presigned links ~1 hour
  (hence the 40-minute portrait cache and the 6-day gallery horizon).
- Texting style ("reply register": `default` / `short-form` / `long-form`)
  is set per room at creation or via `PATCH /rooms/{room_id}/texting-style`,
  and affects the next generated text *and* audio reply.

## What is deliberately not built (yet)

- Payment rail + pricing pages (models ready, see funnel stage 8).
- Own media storage — provider presigned URLs are used directly and expire;
  a Spaces/S3 copy-on-complete step is the planned fix.
- Cam — every cam endpoint answers 403 on the current provider account.
- User-facing character creation — the V2 draft flow exists owner-only in
  `/ops/ohapi`; a customer-facing creator is a later milestone.
- Client-side character "collection" persistence is localStorage for now;
  moving it to the database is a planned milestone.

## Milestone roadmap

- **M0** — this document.
- **M1** — Candy discovery design ported to `/`, `/companions`,
  `/companion/:slug`, new `/collection` (frontend only, real data via
  `companions.list` / `companions.bySlug`). ✅ Built.
- **M3** — Crypto payment rail + `/pricing`. ✅ **Built and tested — activation
  is a pinned TODO for a while before launch** (owner decisions, not code):
  1. Create the NOWPayments account; set `PAYMENTS_PROVIDER=nowpayments`,
     `PAYMENTS_API_KEY`, `PAYMENTS_IPN_SECRET` in the production env.
  2. **Apply for a card rail (CCBill or Epoch) now** — underwriting takes
     weeks, so the clock starts today. The checkout abstraction is ready for
     the second rail.
  3. Live smoke test of the whole funnel (checkout → webhook → active plan)
     against the production database before opening the doors.
- **M3.5 — Generation at 100% (active focus).** Every generation surface
  audited against the verified live-API findings: image quality/resolution
  through the pipeline, video (text and image modes), voice, chat texting
  styles, prompt handling, and credit costs documented against the margin
  formula. Includes batch character creation tooling.
- **M2** — Collection persistence in the database.
- **M4** — Own media storage (copy-on-complete in the media job flow).
- **M5** — Chat surface restyle to the discovery design language.
- **M6** — User-facing character creator (attributes from the provider
  terms catalog, V2 generate → save flow).
