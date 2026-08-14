# OhAPI Integration — Verified Contract

**Source of truth:** [OhAPI API Documentation](https://api.oh.xyz/documentation)
**Base URL:** `https://api.oh.xyz` · **Auth:** `X-API-Key` header on every request

This document records the request and response shapes the application actually
sends. It supersedes `OHAPI_API_COMPLIANCE_AUDIT.md`, which described a contract
that did not match the documentation.

## The documentation is wrong in three places

Every shape below was verified against the live service on 14 August 2026.
Where the documentation and the service disagree, **the service wins** and this
file records what it actually does. `server/ohapiContract.test.ts` locks each one.

| Area | Documented | Actually |
| --- | --- | --- |
| Character listing | `GET /api/v1/characters` | **Does not exist** — returns `403 {"message":"Unknown endpoint"}`. `GET /api/v1/customer-library` is the real listing. |
| Character fields | `character_id`, `name`, `profile_image_url`, `age`, `occupation`, `type` | `characterId` (a **number**), `firstName`, `lastName`, `sfwImage`. No age, occupation, or type is returned at all. |
| Room creation | `{ character_id }` | Also requires `user_id` (or legacy `user_gender`), and `character_id` must be a **string** despite being returned as a number. |

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
| Image | `POST /api/v1/images` | `{ character_id, prompt }` | `job_id`, `presigned_url` |
| Video | `POST /api/v1/videos/create` | `{ character_id, prompt }` or `{ image_url, prompt }`, optional `prompt_enhancement` | `job_id`, `presigned_url` |
| Audio | `POST /api/v1/audio` | `{ character_id, text }` | `job_id`, `presigned_url` |
| Job status | `GET /api/v1/jobs/{job_id}/status` | — | `status`, `presigned_url` |
| Cam session | `POST /api/v1/cam/create` | `{ characterId, restEndpointUrl, apiKey }` | session id, avatar URL, auth token |
| Generate candidate | `POST /api/v2/characters/generate` | character brief | `characterGuid` |
| Candidate status | `GET /api/v2/characters/{guid}/status` | — | `status`, `characterId` |
| Save candidate | `POST /api/v2/characters/save` | `{ characterGuid }` | `status` |

Cam is documented and implemented in the isolated playground, but is not exposed
in the production product. It requires a public webhook receiver, which is a
separate design.

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
— along with `image_prompt` and `detected_level`. Nothing consumes it yet.

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
