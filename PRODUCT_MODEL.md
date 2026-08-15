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
| `/chat/:slug` | Adult confirmed | The conversation. Photos, voice notes, and video are asked for in it and arrive in it. An account is asked for after three messages, not before the first. |
| `/signin` | Public | Email a sign-in link. No password. |
| `/ops/ohapi` | Owner only | Operational studio: sync, curate, create. Not linked from the customer product. |
| `/pilot` | — | Removed. Redirects to `/companions`. |

## The catalog is the provider library

The public catalog is a projection of `GET /api/v1/customer-library`, synced into
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
- Ask her for a photo, a voice note, or a short video — in the conversation,
  in ordinary words. It arrives as a message from her, with whatever line she
  writes to go with it.
- Rename and clear a thread. Clearing removes the stored transcript **and the
  generation records for that companion**, then retires the room. It does not
  claim to erase provider-retained records, and the product says so.
- Report a conversation for safety or quality review.

## Media is part of the conversation, not a form

Saying "can you send me a picture?" is how you get one. `chat.send` reads the
request out of the message, starts the generation against the same room, and the
result lands in the thread at the point it was asked for — with the provider's
`followup_text` as her accompanying line.

Three things follow from that, and each is load-bearing:

- **It never breaks the conversation.** By the time the generation is attempted
  the reply is already written and charged. A spent generation allowance or a
  provider refusal means she does not send the photo; it does not mean the
  message fails.
- **It costs exactly what the panel costs.** Same hourly allowance, same
  ownership, charged before anything exists provider-side.
- **Reading a request wrongly is the expensive mistake.** Inventing one spends
  the customer's allowance and real credit on something they did not ask for, in
  a thread they cannot undo, so detection is deliberately conservative and
  under-triggers by design. `server/ohapiChatIntent.ts` holds the rules and
  `server/ohapiChatIntent.test.ts` holds the cases.

The generation panel still exists as a direct route to the same operations, and
its results now land in the thread too.

## How she writes

Rooms are opened in the provider's `short-form` register rather than its
production default. The default answers in paragraphs; someone you are texting
does not. It costs nothing, applies to voice notes as well as text, and it is
the cheapest realism available.

It is a per-conversation choice, changeable from the chat header and applied by
the provider from her next reply. `default` and `long-form` remain available for
anyone who wants the longer register.

## Signing in

A link to an email address, issued and verified by this server. No password to
store, leak, reset, or have reused from somewhere the customer signed up years
ago — on an adult product, this is usually the account someone least wants
breached.

The session was never the dependency: it is an HS256 JWT signed with our own
`JWT_SECRET` and verified locally. Only the step that established *who* someone
is ran through the hosting platform's identity provider, and that is the step
replaced. Losing that platform no longer means losing every account.

Three things the flow does deliberately:

- **Answers identically for a known and an unknown address.** Anything else
  makes it a membership oracle, which on this product is a disclosure about a
  real person.
- **Stores only a hash of the token.** Reading the table is not a login.
- **Binds the link to the browser that asked for it.** Email security scanners
  follow links; without the nonce cookie they would spend a single-use token
  before the customer clicked. A request from anywhere else is redirected to
  ask again rather than consuming it.

Accounts created through the old provider are matched **by email address**, so
switching how people sign in does not orphan their conversations.

## Talk first, sign up to keep it

A cold visitor arriving from search will not create an account to find out
whether the product is any good. So the wall moved: confirm your age, browse,
open a conversation, and get **three messages and one generation** before
anything is asked of you.

A guest is a real row in `users`, distinguished only by an `openId` that starts
`guest:`. That is deliberate — ownership, allowances, media jobs, and the safety
protocol already key on a user id, and none of them need to learn about a second
kind of account. The identity is created at one moment only: age confirmation.
Nothing is created for a visitor who only browses, and nothing for a crawler.

The free allowance is a lifetime one, not hourly — an hourly reset would make it
free. It is enforced in `chat.send` before the allowance is charged and before
the provider is called, and again inside `submitMediaJob`, which every
generation in the product passes through. A ceiling reachable by finding another
entry point is not a ceiling.

Signing up is what the wall asks for, so the conversation cannot be what it
costs. `chat.adoptGuestConversation` moves the guest's rooms, media, and reports
onto the new account and collapses any duplicate room, then the guest row is
deleted.

## The safety protocol

Some messages are not conversation. If a customer says something that reads as
suicidal ideation or self-harm, `chat.send` stops before the allowance is
charged and before the provider is called at all, so the reply is never
generated.

What comes back is the product speaking, not the companion. Having her answer
in character would be the worst option available: a piece of software the
customer is paying to feel close to, presenting itself as competent to help.
MyGF.ai says who it is instead and points to 988, the Samaritans, and
findahelpline.com.

The exchange stays in the thread — someone who said that and watched it vanish
would reasonably read it as rejection — and an automatic safety report is filed
for review.

`server/ohapiCrisis.ts` holds the vocabulary. **Its bias is the opposite of the
media detector's**: that one under-triggers because a false positive spends the
customer's money, this one over-triggers because a false negative means a person
said something serious and software flirted back. It is a fixed English word
list and therefore a floor, not a ceiling — it will miss indirect phrasing and
other languages, and it must never be described as sufficient on its own.

## What search sees

The client is a single-page app, so every route returned the same HTML shell:
one title and one description for the whole site, and `/robots.txt` and
`/sitemap.xml` answered with that shell at `200 text/html` because the catch-all
matched them too. For a product whose growth is meant to come from search, that
is the difference between having pages and having one page.

`server/seo.ts` rewrites the head of the shell per route before it is sent —
title, description, canonical, Open Graph, and JSON-LD — and serves a real
`robots.txt` and a `sitemap.xml` built from the published catalog. It is not
server-side rendering and does not try to be; the body still hydrates in the
browser exactly as before.

Two rules it enforces:

- **Only the public surface is indexable.** Conversations, the studio, and
  anything unrecognised are `noindex` by default. A customer's thread appearing
  in search results would be a serious privacy failure.
- **The origin is resolved, never hard-coded.** `PUBLIC_BASE_URL` when set,
  otherwise the host that served the request — so canonicals stay correct
  through a domain change instead of pointing at a hostname the site has left.

## Limits

Per account, per UTC hour: 60 messages, 12 media generations, 12 new rooms, and a
40 open-conversation ceiling. Allowance is consumed before a provider room is
created, so an over-limit account cannot leave rooms behind on the way to a
rejection.

## What is deliberately not built

- **Cam.** Not built, and not currently buildable: every documented Cam endpoint
  answers `403 Unknown endpoint` on this account. It would also need a public
  webhook receiver and a separate safety design.
- **Public media galleries.** Generated media is private to the account that
  requested it. There is no shared or public feed.
- **Durable media storage.** Measured against the live service, generated media
  stays fetchable for seven days, so re-hosting is not currently needed. The
  gallery is bounded to six days. Revisit only if the provider shortens that
  window or customers need media kept indefinitely — at which point it needs an
  object store plus a retention and deletion policy, not a quick bolt-on.
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
