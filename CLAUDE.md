# MyGF.ai — orientation

Adult AI companion product. Companions, conversation, and generated photo, voice
and video come from the OhAPI provider. Node + Express + tRPC + Drizzle (MySQL)
on the server, React + wouter on the client.

**Read `CONTRIBUTING.md` first.** It defines the branch rules and the ownership
split with Manus, which owns the visual design. Do not edit `client/src/**`
styling or markup without checking it.

## The one thing to know before touching the provider

**The published OhAPI documentation is wrong in several places.** Verified
against the live service:

- `GET /api/v1/characters` does not exist — `customer-library` is the listing.
- Characters return `characterId` (a number), `firstName`, `lastName`, `sfwImage`.
- `POST /api/v1/rooms` requires `user_id`, and `character_id` must be a string.
- Portrait URLs expire after 1 hour; generated media lasts 7 days.

`server/ohapi.ts` matches the live service, and `server/ohapiContract.test.ts`
locks it. `OHAPI_INTEGRATION.md` records every divergence. **Do not "correct"
this code to match the documentation** — that has already caused one outage-grade
regression.

To re-verify against the live API:

```
OHAPI_API_KEY='...' node scripts/ohapi-probe.mjs          # read-only
OHAPI_API_KEY='...' node scripts/ohapi-probe.mjs --chat   # creates a room
OHAPI_API_KEY='...' node scripts/ohapi-probe.mjs --image  # costs credit
```

## Layout

| Path | What |
| --- | --- |
| `server/ohapi.ts` | Provider client. The only file that talks to OhAPI. |
| `server/ohapiChat.ts` | Conversation. Allowance is charged before any provider resource is created. |
| `server/ohapiMedia.ts` | Image, video, audio, job polling. Jobs are owned per account. |
| `server/ohapiCompanions.ts` | Public catalog. Degrades to empty rather than failing the page. |
| `server/ohapiStudio.ts` | Owner-only operations at `/ops/ohapi`. |
| `server/ohapiAccess.ts` | Server-enforced adult confirmation. |
| `drizzle/schema.ts` | Schema. Migrations are generated, never hand-written. |

## Non-negotiables

- `OHAPI_API_KEY` is server-only. Never in a bundle, log, audit row, or
  user-facing error.
- No generic provider proxy. Only reviewed, typed operations.
- Adult confirmation is enforced server-side on every generative call.
- Allowances are charged before provider-side resources exist.
- Provider error text never reaches the customer — `server/ohapiErrors.ts` maps
  status classes to safe copy.

## Verify before pushing

```
pnpm check && pnpm test && pnpm build
```

The build must emit no warnings. Migrations run with `pnpm db:push` and need a
real `DATABASE_URL`.
