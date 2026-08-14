# OhAPI Integration — Verified Contract

**Source of truth:** [OhAPI API Documentation](https://api.oh.xyz/documentation)
**Base URL:** `https://api.oh.xyz` · **Auth:** `X-API-Key` header on every request

This document records the request and response shapes the application actually
sends. It supersedes `OHAPI_API_COMPLIANCE_AUDIT.md`, which described a contract
that did not match the documentation.

## Corrections applied

The previous implementation diverged from the published contract in three ways.
All three are fixed in `server/ohapi.ts` and locked by `server/ohapiContract.test.ts`.

| Call | Was sending | Documented contract |
| --- | --- | --- |
| `POST /api/v1/text` | `{ room_id, prompt }` | `{ room_id, character_id, message }` |
| `POST /api/v1/rooms` | `{ user_gender, character_id, texting_style }` | `{ character_id }` |
| Catalog | never called; catalog was hard-coded in the client | `GET /api/v1/characters` |

The `user_gender` field is not part of the documented room contract, so the
product no longer asks a customer to choose one before they can talk.

## Endpoints in use

| Purpose | Method + path | Request | Response |
| --- | --- | --- | --- |
| Character library | `GET /api/v1/characters` | — | `character_id`, `name`, `age`, `occupation`, `profile_image_url`, `type` |
| Credential check | `GET /api/v1/customer-library` | — | saved characters and digital twins |
| Create room | `POST /api/v1/rooms` | `{ character_id }` | `room_id` |
| Chat | `POST /api/v1/text` | `{ room_id, character_id, message }` | reply text |
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

## Response tolerance

Documented payloads are flat, but several responses wrap their result in `data`,
`result`, or `response`, and key casing varies between `snake_case` and
`camelCase`. The readers in `server/ohapi.ts` accept either, so a wrapped body
does not read as a missing field. This is covered by
`server/ohapiContract.test.ts`.

## Asynchronous media

1. `POST` to the media endpoint returns `job_id`.
2. Poll `GET /api/v1/jobs/{job_id}/status` every 2 seconds.
3. Stop at `completed` or `failed`, or after the documented 5-minute ceiling.
4. Presigned URLs expire quickly — treat them as short-lived.

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
