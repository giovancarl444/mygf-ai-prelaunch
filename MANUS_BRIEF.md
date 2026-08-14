# Brief for Manus

Paste this as the first instruction of a new Manus session on this project.

---

You are the **frontend design owner** for MyGF.ai. Another engineer owns the
server, the database, and the provider integration. This split only works if you
stay on your side of it, so read this fully before changing anything.

## First, before you touch a single file

The GitHub repository `giovancarl444/mygf-ai-prelaunch` is now the **single
source of truth**, and its `main` branch is ahead of whatever copy you currently
hold. Your local version is stale.

1. **Pull `main` from GitHub.** Do not skip this and do not work from your
   existing copy.
2. **Do not push to `main`.** Create a branch named `manus/<what-you-are-doing>`.
3. **Do not force-push anything.**

If you push your current state over `main`, you will destroy a substantial
amount of verified backend work, including a provider integration that was
corrected against the live API. There is a recovery branch —
`recovery/provider-verified-rebuild-20260814` — but do not rely on it.

Then read `CONTRIBUTING.md` in the repository root. It is short and it governs.

## What the product is now

It changed significantly. It is no longer a landing page with a technical pilot.

| Route | What it is |
| --- | --- |
| `/` | Landing page. Hero, live companions, capabilities, boundaries. |
| `/companions` | Full catalog with search and an age filter. |
| `/companion/:slug` | One companion's profile and the entry point to her chat. |
| `/chat` | The signed-in customer's conversations. |
| `/chat/:slug` | The conversation, with photo, voice and video generation beside it. |
| `/ops/ohapi` | Owner-only operations. **Not a customer surface — do not style it as one or link to it from the product.** |

The catalog is real. Every companion listed comes from the provider library and
can actually be opened into a conversation. **If the catalog renders empty, that
is correct** and means the library has not been synced yet — design the empty
state, do not fill it with examples.

## Your remit

Yours to change freely:

- `client/src/index.css` and `client/src/pages/*.css` — all visual design.
- `client/src/components/**` — layout and styling.
- `client/src/pages/**` — markup, structure, and copy.
- `client/index.html` — but read the forbidden list below first.

The current design is deliberately plain. It exists to be correct, not to be
finished. Replace it. Art direction, typography, motion, imagery, responsive
behaviour, and the overall feel are yours.

## Not yours

Do not modify:

- `server/**` — the entire backend.
- `drizzle/**` — schema and migrations.
- `scripts/**`, `tools/**`.

And do not change, from inside the client:

- **Which data a page requests.** You may restyle anything a `trpc.*` query
  returns. Do not add, remove, or rename a query or its inputs.
- **Any field name coming from the server.** If a design needs data that is not
  currently returned, write down what you need and ask. Do not invent a field
  and do not hard-code a value so a layout looks complete.

## Five things that must not reappear

Each was a real defect that was found and removed. Reintroducing one is a
regression, not a style choice.

1. **Hard-coded companions.** The previous build listed eighteen invented
   companions of which one was real, so seventeen cards led nowhere. Never place
   a companion card that cannot be opened.
2. **A link that loses which companion was clicked.** Every card must route to
   `/companion/:slug` for that specific companion. The previous build sent every
   card to one shared page which then picked a companion for the visitor.
3. **An unset `%VITE_...%` placeholder in `index.html`.** One shipped, so every
   page load requested a literal un-substituted URL and returned 400. If you add
   analytics, inject it from `main.tsx` only when the variable is defined.
4. **A checkbox as the only gate.** The adult confirmation is enforced on the
   server. Present it however you like; it is not what enforces anything.
5. **Fabricated social proof.** No invented reviews, ratings, testimonials, or
   user counts.

## Two known issues you are welcome to fix

- Fonts load from Google's CDN, which sends every visitor's IP to Google on a
  product that promises privacy. Self-hosting the font file would close it.
- Provider portraits are full-size PNGs, around 2.5 MB each. Sizing them down
  matters once the catalog grows.

## Before you push

All three must pass:

```
pnpm check
pnpm test
pnpm build     # must emit no warnings
```

Then open the branch and say what changed. Anything touching `server/**` or
`drizzle/**` will be rejected — raise it instead and it will be done properly.
