# OhAPI Integration — Verified Contract

**Source of truth:** [OhAPI API Documentation](https://api.oh.xyz/documentation)
**Base URL:** `https://api.oh.xyz` · **Auth:** `X-API-Key` header on every request

This document records the request and response shapes the application actually
sends. It supersedes `OHAPI_API_COMPLIANCE_AUDIT.md`, which described a contract
that did not match the documentation.

## The documentation is wrong in five places

Every shape below was verified against the live service on 14 August 2026.
Where the documentation and the service disagree, **the service wins** and this
file records what it actually does. `server/ohapiContract.test.ts` locks each one.

| Area | Documented | Actually |
| --- | --- | --- |
| Character listing | `GET /api/v1/characters` | **Does not exist** — `403 {"message":"Unknown endpoint"}`. `GET /api/v1/customer-library` is the real listing. |
| Character fields | `character_id`, `name`, `profile_image_url`, `age`, `occupation`, `type` | `characterId` (a **number**), `firstName`, `lastName`, `sfwImage`. No age, occupation, or type is returned at all. |
| Room creation | `{ character_id }` | Also requires `user_id` (or legacy `user_gender`), and `character_id` must be a **string** despite being returned as a number. |
| Audio | `POST /api/v1/audio` | **Does not exist** — `403 Unknown endpoint`. `POST /api/v1/audio/notes` is the real path. |
| Cam | `POST /api/v1/cam/create` | **Does not exist** on this account — `403 Unknown endpoint`. No Cam path responds. |

Empty request bodies are a cheap way to re-check this: the service replies with
a validation error naming its own required fields, and nothing is generated or
billed. That is how `user_id` and the in-room flow were found.

A correction to an earlier note in this file: the original implementation's
`POST /api/v1/text { room_id, prompt }` was **not** broken. The service accepts
both `prompt` and `message` and returns 200 either way. The documented
`{ room_id, character_id, message }` is what is sent now, but the previous shape
worked. Removing `user_gender` from room creation, on the other hand, did break
it — that field was load-bearing, and `user_id` now takes its place.

## Endpoints in use

| Purpose | Method + path | Request | Response |
| --- | --- | --- | --- |
| Character library | `GET /api/v1/customer-library` | — | `{ success, characters[], digitalTwins[] }` |
| Create room | `POST /api/v1/rooms` | `{ character_id: string, user_id: string }` | `{ room_id }` (a UUID) |
| Chat | `POST /api/v1/text` | `{ room_id, character_id, message }` | `{ content, job_id, message_id, tool_call }` |
| Image | `POST /api/v1/images` | `{ character_id, prompt }`, plus `room_id` for the in-room flow | 202 with `job_id`, `presigned_url` |
| Video | `POST /api/v1/videos/create` | `{ character_id, prompt }` or `{ image_url, prompt }`, optional `prompt_enhancement` | 202 with `job_id`, `presigned_url` |
| Audio | `POST /api/v1/audio/notes` | `{ character_id, text }`, plus `room_id` for the in-room flow | 202 with `job_id`, `presigned_url` |
| Job status | `GET /api/v1/jobs/{job_id}/status` | — | `{ job_id, status, url, results, error }` |
| Generate candidate | `POST /api/v2/characters/generate` | character brief | `characterGuid` |
| Candidate status | `GET /api/v2/characters/{guid}/status` | — | `status`, `characterId` |
| Save candidate | `POST /api/v2/characters/save` | `{ characterGuid }` | `status` |

**Cam is not available.** Every documented Cam path answers `403 Unknown
endpoint` on this account, so it is not a design decision to defer it — there is
nothing to call. The playground still shows a Cam tab; it will fail. Revisit only
if the provider confirms the capability is enabled.

**The in-room flow.** Both images and audio accept `room_id` instead of, or
alongside, `character_id`. When the customer already has a conversation open its
room is passed, so the generation carries that context — and it is the in-room
flow that returns the companion's accompanying line.

## Portraits expire after one hour

`sfwImage` is a presigned S3 URL carrying `X-Amz-Expires=3600`, so it is valid
for exactly one hour from the moment the library was read. It is also long —
observed at 1,741 characters, which is why `ohapi_characters.profileImageUrl` is
`varchar(2048)`.

Storing that URL and serving it to visitors would give every catalog portrait a
one-hour shelf life. Instead `getOhApiPortraits` re-reads the library and caches
the freshly signed URLs in memory for 40 minutes, and the public catalog serves
those. The stored column is kept only as a record of what was last seen. If the
refresh fails, a card falls back to its placeholder rather than rendering a link
that is certain to be dead.

The portrait itself is a full-size PNG — the observed one is 2.36 MB, which is
heavy for a card thumbnail. Resizing is worth doing before the catalog grows.

## Response tolerance

Key casing varies between `snake_case` and `camelCase`, and some responses wrap
their result in `data`, `result`, or `response`. The readers in `server/ohapi.ts`
accept either, and the normalizer accepts both the documented and the actual
field names so a provider-side correction will not break the catalog.

## Asynchronous media

1. `POST` to the media endpoint returns **HTTP 202** with `job_id`, `status`, and
   a `presigned_url`.
2. Poll `GET /api/v1/jobs/{job_id}/status` every 2 seconds. It answers with
   `{ job_id, status, url, results, error }` — note **`url`**, not
   `presigned_url`, on this endpoint.
3. Stop at `completed` or `failed`, or after the documented 5-minute ceiling. A
   measured image generation completed in about 20 seconds.

**The `presigned_url` in the submission response is issued before any work is
done.** Treating its presence as completion reports every job as finished the
moment it is queued, so completion is decided by `status` alone.

Result links are legacy presigned S3 URLs carrying `Expires` set **seven days**
ahead — measured, not documented. That is long enough that re-hosting is not
currently necessary; the in-product gallery is bounded to six days so a dead link
is never rendered. Media itself is large: a generated image measured 2.5 MB.

`results` also carries a `followup_text` — a line written to accompany the image
— along with `image_prompt` and `detected_level`.

`image_prompt` is the prompt the provider actually generated from, which is a
rewrite of the one we sent. It is now read back on `getOhApiJobStatus` and
surfaced to the owner on `media.jobStatus`. This is the only view we have of
that rewrite, and it is what separates a prompt problem from a model problem
when a result looks poor — without it, image quality is guesswork.

### Image quality controls

**Correction, 14 August 2026.** An earlier note here said the documentation
exposed no quality parameters. That was wrong: it came from a text fetch of
`api.oh.xyz/documentation`, which renders its request tables client-side, so the
fetch returned a partial page and the absence was read as fact. The rendered
page documents four optional fields on `POST /api/v1/images`:

| Field | Type | What it does |
| --- | --- | --- |
| `prompt_enhancement` | boolean | The provider expands the prompt with its own model to improve quality and detail. Disabled, the prompt is used as-is. |
| `user_gender` | `male` \| `female` | Tailors the scene when enhancement is on. Omitted, it defaults to the opposite of the character's gender. |
| `resolution` | string \| `[w, h]` | `9:16` → 720×1280, `16:9` → 1280×720, `1:1` → 1024×1024, `4:3` → 960×720, `3:4` → 720×960. An explicit `[width, height]` array is also accepted. |
| `character_id`, `prompt` | string | Required. |

All four are now sent from `server/ohapiMediaJobs.ts`: enhancement on,
resolution `9:16`, and `user_gender` only when the room recorded one.

**These are documented, not observed.** This documentation has been wrong about
this service before — see the audio path above — and the API key needed to probe
it has been rotated out. So `requestOhApiImage` sends the tuning fields and, if
the service answers 400, retries once with only the request shape we have
watched succeed. A customer waiting for a photo should not pay for our optimism.
`ohapiContract.test.ts` pins both paths.

Related divergence: the documented text request is `{ room_id, prompt }` with no
`character_id`. We send `{ room_id, character_id, message }`, which is what the
live service was observed to accept. Not changed — see the standing rule about
not correcting this code to match the documentation.

Every job is written to `ohapi_media_jobs` with the requesting `userId`. A job is
only pollable by the account that created it, so a job id is never a bearer token
for someone else's media.

## Boundaries this integration keeps

- **Server-only credential.** `OHAPI_API_KEY` is read in `server/_core/env.ts` and
  used only in `server/ohapi.ts`. It is never returned from a procedure, embedded
  in a bundle, written to an audit row, or included in a user-facing error.
- **No generic proxy.** Only the typed operations above are exposed. There is no
  passthrough endpoint and no client-supplied path.
- **Provider detail never reaches the customer.** `server/ohapiErrors.ts` maps
  status classes to product-safe copy. Response bodies stay server-side.
- **Retries only where repeating is safe.** Bounded retry applies to `GET` on
  429/500/502/503/504 only. Every side-effecting `POST` runs once.
- **Adult confirmation is enforced server-side.** `server/ohapiAccess.ts` reads a
  stored timestamp on the account. The browser checkbox presents that state; it
  does not create it.

## Rate limits

Provider limits are not published. The application applies its own per-account
hourly ceilings in `server/ohapiDb.ts`: 60 messages, 12 media generations, 12 new
rooms, and 40 concurrent open conversations. Allowances are consumed before any
provider-side resource is created, and refunded when a submission never reached
the provider.

## Moderation

Prompts are screened provider-side; a violation returns `400`. That is surfaced
to the customer as a request to rephrase, with no provider text included. Adult
generation requires verified partner access on the API key.


## The specification, vendored

`docs/ohapi-openapi.json` is the provider's own OpenAPI 3.0.3 description of
itself — 64 operations — captured from `https://api.oh.xyz/openapi.json`.
`docs/OHAPI_REFERENCE.md` is generated from it. Refresh both, and see what moved,
with:

```
node scripts/ohapi-docs.mjs           # refresh and report route changes
node scripts/ohapi-docs.mjs --check   # fail if the vendored copy is stale
```

Read that instead of the documentation page. The page renders its request tables
client-side from this same spec, so fetching the page as text returns a partial
document — which is how "the image endpoint accepts no quality parameters" got
written down as fact when it accepts three.

### What the specification confirms

- `GET /api/v1/characters` does not exist. It is absent from all 64 operations.
  `customer-library` is the listing, as observed.
- `/api/v1/audio/notes` is the real audio path. The prose page's `/api/v1/audio`
  appears nowhere in the spec.
- **Audio is synchronous.** It answers `200 { url }` — no `job_id`. Images and
  videos answer `202` with one, which is why the reference badges those two
  "Async" and audio nothing. We were requiring a job id on every media
  submission, so a successful voice note was read as a malformed response and
  rejected. `requestOhApiAudio` now accepts either shape, and a synchronous
  result is recorded as an already-complete job under a local `local-audio-…`
  identifier so the gallery, the transcript, and the ownership checks keep one
  shape to handle.

### Where we still diverge, deliberately

| We send | Spec says | Why |
| --- | --- | --- |
| `POST /images` with `room_id` | not listed | Observed to work, and it is what returns `followup_text`. |
| `POST /text` with `character_id` and `message` | `room_id` + `prompt` | Observed to work. Not changed — see the standing rule. |
| `POST /rooms` with `user_id` | `user_gender` required | Observed: the service asks for "user_id (or legacy user_gender)". |
| `POST /audio/notes` with `text` | `prompt` | Both are now sent; the service ignores fields it does not know. |

The rule stands: this table is a record of what to re-test when a key is
available again, not a list of things to "fix" toward the documentation.

### Available and not yet used

Recorded so these are decisions rather than oversights.
`texting_style` was on this list and is now used: rooms open as `short-form`,
changeable per conversation through `PATCH /api/v1/rooms/{room_id}/texting-style`.
Room creation drops the field and retries if the service rejects it, because
nothing may stand between a customer and opening a chat.

- **Video controls** — `length` (5/10/15), `resolution`, and for image-to-video a
  `category` enum of motion types. We send none of them.
- **`GET /api/v1/videos/get`** — a separate status path for image-to-video.
- **Character generation** — `POST /api/v1/characters/generate` and `/save`, a v2
  pair, and roughly thirty attribute vocabularies (`/characters/kinks`,
  `/ethnicities`, `/personalities`, and so on) that would let companions be
  authored rather than only synced.
- **Cam sessions** — `POST /api/v1/cam/create`, `GET /cam/sessions`,
  `DELETE /cam/sessions/{sessionId}`.
- **Digital twins** — create, update, and status endpoints.

### One thing to confirm with the provider

Explicit generation "is restricted to verified adult platform partners and
requires a validated API key with adult content permissions enabled." Whether
our key carries that permission is not visible from the API, and it decides
whether a large part of this product works. Worth asking them directly.
