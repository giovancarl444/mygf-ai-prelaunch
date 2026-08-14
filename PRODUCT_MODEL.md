# MyGF.ai Product Model

## The rule this product is built on

**Clicking a companion opens a conversation with that companion.**

The previous build routed all eighteen catalog cards to `/pilot`, a technical
page that also contained the owner's companion-creation controls. Whoever you
clicked, you were sent to the same place, and the page then selected whichever
companion happened to be first in the list. That is fixed: identity is carried
from the card to the chat, and the creation tooling has moved to the owner
studio where it belongs.

## Surfaces

| Route | Audience | What it is |
| --- | --- | --- |
| `/` | Public | Landing page. Live companions, what you can do together, where the lines are. |
| `/companions` | Public | Full catalog with search and age filter. |
| `/companion/:slug` | Public | One companion's profile, and the entry point to her chat. |
| `/chat` | Signed in | Your conversations. |
| `/chat/:slug` | Signed in + adult confirmed | The conversation, with photo, voice, and video generation beside it. |
| `/ops/ohapi` | Owner only | Operational studio: sync, curate, create. Not linked from the customer product. |
| `/pilot` | — | Removed. Redirects to `/companions`. |

## The catalog is the provider library

The public catalog is a projection of `GET /api/v1/characters`, synced into
`ohapi_characters` from the studio. This matters: **everyone listed can actually
be opened.** The previous catalog was eighteen hand-authored entries of which one
had a provider mapping, so seventeen cards led nowhere real.

Consequences worth knowing:

- If the provider library is empty, the catalog is empty and says so. It does not
  invent companions.
- A companion that disappears from the provider library is retired locally on the
  next sync rather than left as a dead card.
- The owner controls visibility per companion. Synced companions default to
  published; hiding one removes it from the public catalog immediately.
- Marketing copy about a companion (`tagline`) is owner-authored, but her name,
  age, occupation, and portrait come from the provider record — so the profile
  cannot drift from the character the model actually plays.

## Entering a conversation

1. **Public** — visitor opens `/companion/:slug` and presses *Chat with her*.
2. **Sign-in** — if signed out, an explained gate appears. No silent redirect: the
   page states why an account is required before the OAuth flow starts.
3. **Adult confirmation** — a one-time confirmation recorded on the account. It is
   checked server-side on every generative request from then on.
4. **Conversation** — the room is created on first message and reused after that,
   so the provider keeps context.

## What a signed-in customer can do

- Talk, with the thread persisted and account-owned.
- Ask for a photo, a voice note, or a short video, generated in her likeness.
- Rename and clear a thread. Clearing removes the local transcript and retires the
  room; it does not claim to erase provider-retained records, and the product says so.
- Report a conversation for safety or quality review.

## Limits

Per account, per UTC hour: 60 messages, 12 media generations, 12 new rooms, and a
40 open-conversation ceiling. Allowance is consumed before a provider room is
created, so an over-limit account cannot leave rooms behind on the way to a
rejection.

## What is deliberately not built

- **Cam.** Documented and present in the isolated playground, but it needs a public
  webhook receiver and a separate safety design before it belongs in the product.
- **Public media galleries.** Generated media is private to the account that
  requested it. There is no shared or public feed.
- **Reviews, ratings, testimonials.** None exist, and none should be fabricated.

## Owner operations

Everything that mutates provider state lives at `/ops/ohapi`:

- Sync the companion library and curate who is visible.
- Create a companion: generate a private candidate, review it, explicitly save it,
  then sync her into the catalog. A candidate only becomes real when the provider
  confirms `saved` with a durable `characterId`.
- Read-only credential check and a sanitized action ledger.

The studio never accepts or displays an API key, and exposes no generic request
composer.

## Development tooling

`tools/oh-api-playground/` is a separate browser-local BYOK utility for exercising
the API directly. It is excluded from the application's TypeScript project, Vite
build, and test run, and a regression test blocks production source from importing
it. It must never be given the production credential.
