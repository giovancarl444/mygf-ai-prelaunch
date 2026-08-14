# Working on MyGF.ai

Two systems build this repository: **Manus** owns how it looks, **Claude** owns
how it works. That split only holds if both follow the rules below, because two
agents pushing to the same branch will silently overwrite each other.

## Branch rules

**`main` is the single source of truth.** The deployed application is built from
`main`, and every other copy — including any managed project workspace — is
downstream of it.

1. **Pull `main` before you start.** Not doing this is how work gets destroyed.
2. **Never commit directly to `main`.** Work on a branch:
   - Manus: `manus/<what-you-are-doing>`
   - Claude: `claude/<what-you-are-doing>`
3. **Never force-push** `main`, `backup/*`, or `recovery/*`.
4. If your branch cannot merge cleanly, **stop and ask**. Do not resolve a
   conflict in someone else's area by taking your own side.

## Who owns what

| Path | Owner | Rule |
| --- | --- | --- |
| `client/src/index.css`, `client/src/pages/*.css` | **Manus** | Free rein on visual design. |
| `client/src/components/**` (presentation) | **Manus** | Layout and styling; keep the props each component receives. |
| `client/src/pages/**` (markup and copy) | **Manus** | Change structure and wording freely. Do **not** change which data is requested. |
| `client/index.html` | **Manus** | See the forbidden list below before adding a script tag. |
| `server/**` | **Claude** | Provider integration, authorization, rate limits, data access. |
| `drizzle/**` | **Claude** | Schema and migrations. |
| `scripts/**` | **Claude** | Diagnostics. |
| `tools/oh-api-playground/**` | **Neither** | Isolated development utility. Must never be imported by the app. |

## The line that must not move

Presentation may change freely. **The data contract may not.** Specifically, do
not change without agreement:

- The tRPC procedure names and their inputs and outputs (`server/routers.ts`).
- Any `drizzle/schema.ts` column, or any migration in `drizzle/`.
- Anything in `server/ohapi.ts`. Every request shape there is verified against
  the live API and locked by `server/ohapiContract.test.ts`. **The published
  provider documentation is wrong in several places** — see
  `OHAPI_INTEGRATION.md`. Do not "fix" this file to match the docs.

If a design needs data the API does not currently return, say so and it will be
added properly. Do not invent a field, and do not hard-code a value to make a
layout look finished.

## Things that must never come back

Each of these was a real defect that was removed. Reintroducing one is a
regression, not a preference:

- **Hard-coded companions.** The catalog comes from the provider library. A card
  that cannot be opened must not appear. If the catalog is empty, the empty state
  is correct.
- **A companion link that does not carry her identity.** Every card routes to
  `/companion/:slug`. Nothing may route a visitor to a generic page and pick a
  companion for them.
- **An unset `%VITE_*%` placeholder in `index.html`.** It ships literally and
  returns 400 on every page load. Inject such scripts from `main.tsx`, only when
  the variable is defined.
- **Client-side-only gating.** The adult confirmation is enforced on the server.
  A checkbox may present that state; it may never be the only thing enforcing it.
- **An unauthenticated file or storage proxy.**

## Before you push

All three must pass:

```
pnpm check     # TypeScript
pnpm test      # deterministic suite, no network
pnpm build     # production build
```

The build must emit no **correctness** warnings. Vite's "chunks are larger than
500 kB" notice is a performance advisory, not a defect, and does not block — the
deployed bundle is larger than a local one because the platform runtime injects
its own code. Everything else marked `(!)` does block, because that is how an
unset `%VITE_*%` placeholder announced itself while returning 400 on every page
load.

## Where things are written down

- `PRODUCT_MODEL.md` — what the product is, every route, and what is deliberately
  not built.
- `OHAPI_INTEGRATION.md` — the verified provider contract and where the official
  documentation is wrong.
- `RELEASE_RECOVERY.md` — rollback points. Append; never rewrite history.
- `GITHUB_BACKUP_OPERATING_STANDARD.md` — backup tags and recovery branches.
