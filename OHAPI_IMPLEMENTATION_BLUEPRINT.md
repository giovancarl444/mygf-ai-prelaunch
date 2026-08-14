# OhAPI Implementation Blueprint for MyGF.ai

## Recommended First Live Slice

The first real-model release should be **text chat with one owner-approved character**, not public character generation or media generation. This limits external spend, gives MyGF.ai a controlled conversation-quality test, and makes room continuity testable. OhAPI documents the required interaction chain: create one persisted room for a character, then submit messages to that room; the provider explicitly recommends reusing rooms for context continuity. [1]

| Layer | Responsibility | Boundary |
| --- | --- | --- |
| Browser | Lets an authenticated, adult-eligible user select one published MyGF.ai companion and submit a message. | Never receives the OhAPI key, an external room ID, or an arbitrary provider character ID. |
| MyGF.ai server | Resolves MyGF.ai companion → approved OhAPI `characterId`; creates/reuses an owned room; validates, sends, stores, and returns a text turn. | Holds the API credential and enforces authorization, rate limits, audit records, and product boundaries. |
| OhAPI | Creates a room and produces text for the approved character. | Called only from the server with `X-API-Key`; provider moderation and status codes are handled explicitly. [1] |
| Database | Stores companion mappings, provider room mappings, conversation messages, and asynchronous job metadata. | Stores provider IDs and status only—not secret keys or expiring presigned URL bytes. |

## Required Data Model

| Table | Essential fields | Purpose |
| --- | --- | --- |
| `ohapi_characters` | `id`, `worldSlug`, `providerCharacterId`, `status`, `approvedAt`, `createdAt` | Maps a published MyGF.ai world to a provider character only after owner approval. |
| `ohapi_rooms` | `id`, `userId`, `ohapiCharacterId`, `providerRoomId`, `textingStyle`, `createdAt`, `lastUsedAt` | Ensures one controlled external room is reused per user-and-character relationship. |
| `ohapi_messages` | `id`, `roomId`, `role`, `content`, `providerRequestId?`, `createdAt` | Maintains product-visible thread history and an audit trail. |
| `ohapi_media_jobs` | `id`, `roomId?`, `providerJobId`, `kind`, `status`, `resultKey?`, `expiresAt?`, `createdAt` | Tracks asynchronous image, audio, or video requests without treating presigned URLs as durable storage. |

## Server Contract

The server should expose narrow internal procedures rather than proxying the provider API:

| MyGF.ai procedure | Server-only provider action | Guardrails |
| --- | --- | --- |
| `companions.listPublished` | Reads MyGF.ai records only. | No external call or provider ID disclosure. |
| `chat.open` | Reuses or creates `POST /api/v1/rooms` with the approved character. [1] | Authenticated account, adult eligibility confirmation, ownership check, and one room per character/user. |
| `chat.send` | Calls `POST /api/v1/text` using the persisted room and validated prompt. [1] | Message length cap, rate limit, provider-error mapping, audit record, no therapeutic or human-identity claims. |
| `admin.characters.generate` | Starts the V2 generation flow. [1] | Owner-only; creates a private draft, never a public world. |
| `admin.characters.approve` | Saves an approved generated character and binds returned `characterId`. [1] | Owner-only, immutable approval log, confirmation before final save. |
| `admin.media.start` | Starts an asynchronous media job only when intentionally enabled. [1] | Owner-only during pilot; job cap, cost cap, moderation failure surfaced, result copied to managed storage before URL expiry. |

## Credential and First-Test Requirements

The project needs one secure project secret: `OHAPI_API_KEY`. It must be stored server-side and never passed to React, HTML, browser logs, analytics, or Git. The first connectivity test should be a non-generative authenticated discovery call from the server, followed by a single approved-character room and a single non-explicit text exchange. The real-model conversation interface should remain disabled until that sequence succeeds and the resulting content, error handling, and cost behavior have been manually reviewed.

> **Do not begin with explicit media generation.** OhAPI documents that explicit content needs verified adult-partner permissions, while media work is asynchronous and outputs use expiring presigned URLs. The correct technical sequence is text-only validation first, then owner-controlled non-public character generation, then optional media jobs with durable managed storage. [1]

## Error and Operations Policy

The server will translate provider failures into product-safe messages. It should preserve machine-readable details internally, but never display raw provider errors or keys to end users. The integration must treat `400` moderation results, `401` authentication failures, `403` insufficient credit or permission responses, `422` validation failures, `429` throttling, and `5xx` failures differently. Async jobs require a 2–5 second polling interval and a five-minute upper bound, in line with the provider’s documented guidance. [1]

## Go / No-Go Checklist

| Gate | Required before live user access |
| --- | --- |
| Secure credential | The owner supplies `OHAPI_API_KEY` through the project secret workflow. |
| Partner verification | A non-generative authenticated check confirms active permissions without spending media credits. |
| Character approval | At least one adult fictional character is generated, reviewed, explicitly saved, and mapped to one MyGF.ai world. |
| Access control | Protected server procedures bind rooms to the authenticated user and prevent cross-user or arbitrary-ID access. |
| Product safety | Adult gating, clear AI disclosure, non-therapy language, abuse reporting path, rate limits, and retained audit records are in place. |
| Media durability | Any asynchronous output is copied to managed storage before its presigned URL expires. |
| Cost controls | Per-user and per-day caps are defined before public chat or media is enabled. |

## References

[1]: https://api.oh.xyz/documentation "OhAPI official API documentation"
