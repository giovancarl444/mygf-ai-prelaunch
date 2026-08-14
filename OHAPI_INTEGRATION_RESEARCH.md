# OhAPI Integration Research

## Official Documentation Findings

OhAPI documents a REST API at `https://api.oh.xyz` authenticated through an `X-API-Key` request header. The partner key is required for every call. The documentation describes a character lifecycle in which a character is generated asynchronously, polled until it is ready, explicitly saved after approval, and then addressed by a durable `characterId` for later media and text requests.

| Product need | Documented OhAPI capability | Implementation implication |
| --- | --- | --- |
| Browse available characters | Customer-library and character discovery endpoints | Keep MyGF.ai catalog records and external `characterId` mappings separate; do not expose keys in the browser. |
| Start a conversation | `POST /api/v1/rooms` with a character identifier | Persist one room identifier per authorized user-and-character relationship; do not create a new room for every message. |
| Send a text turn | `POST /api/v1/text` with room, character, and message | Send calls must be server-side and gated behind adult eligibility, app authorization, moderation, and rate controls. |
| Generate character media | Image, audio, and video endpoints | Image and video work is asynchronous. Store job identifiers, poll status conservatively, and persist downloaded outputs because presigned URLs expire. |
| Create a new character | V2 generate → status polling → explicit save | Treat generation as an owner-managed workflow. A generated character must not appear in the public catalog until the owner approves and saves it. |

## Reliability and Safety Facts

The documentation describes `400` moderation rejections, `403` insufficient access or credit, `422` validation failures, `429` throttling, and `5xx` transient failures. It specifically recommends reusing rooms, polling asynchronous jobs every 2–5 seconds with a bounded maximum wait, and downloading presigned media URLs promptly. The documentation states that explicit material requires a verified adult platform partner and API-key permissions; this must be verified through a server-side, adult-only workflow before any such feature is surfaced.

## Current Integration Position

No API key has been supplied to this project, and the session-level connector configuration could not be read because its sandbox permission check returned an unexpected EOF. The safe next step is therefore **architecture and documentation only**: create a server-only integration boundary, schema for external identifiers and jobs, and an owner-controlled test harness after a valid OhAPI credential is explicitly provided through secure project secrets. No real model request, character generation, room creation, or media generation has been attempted.

## Endpoint Inventory Confirmed in the Interactive Reference

The official endpoint directory currently lists room creation at `POST /api/v1/rooms`, room texting-style updates at `PUT` or `PATCH /api/v1/rooms/{room_id}/texting-style`, and text generation at `POST /api/v1/text`. It separately lists asynchronous image generation at `POST /api/v1/images`, audio notes at `POST /api/v1/audio/notes`, video generation at `POST /api/v1/videos/create`, and job polling at `GET /api/v1/jobs/{job_id}/status`. The precise field schemas will be captured from the expanded endpoint reference before any server implementation is drafted.

## Room Contract Confirmed

The interactive reference defines room creation as `POST /api/v1/rooms` with mandatory `user_gender` and `character_id`, plus optional `texting_style`. The documented texting-style values are `default`, `short-form`, and `long-form`; the API returns a `room_id` to persist and reuse for subsequent interactions. For MyGF.ai, the server should bind that external room ID to an authenticated internal user and a selected, approved external character. It must never accept an arbitrary room or character identifier from the browser without an ownership check.

## Text Contract Confirmed

The official text endpoint is `POST /api/v1/text`. It requires the partner key, a persisted `room_id`, and a `prompt`; the documented successful response returns generated character text in a `content` field. The minimal safe product path is therefore a server-side `sendMessage` procedure that receives only a selected internal companion identifier plus user text, resolves the approved external character and owned room internally, forwards the request, stores the response, and returns text to the interface. Browser clients must never receive the OhAPI key, arbitrary external IDs, or unbounded direct access to this endpoint.

## Character Approval Lifecycle Confirmed

OhAPI’s documented V2 creation path is `POST /api/v2/characters/generate`, followed by status polling at `GET /api/v2/characters/{characterGuid}/status` every 2–3 seconds until `ready`, explicit approval and `POST /api/v2/characters/save`, then a second status poll until `saved`. The final saved status returns the durable `characterId` required for text, images, and video. The documentation cautions that a saved character’s images cannot be regenerated; a new generation must be created and approved instead. MyGF.ai should therefore use a private owner-only review queue and create a catalog record only after the saved status is confirmed.

The interactive documentation visibly documents the lifecycle and approved attribute-catalog endpoints, but its expanded generation-field table did not remain reachable through the current rendered control state. The correct next implementation step is not to invent those fields: obtain the credential securely, run only a documented low-impact authenticated discovery call, and then confirm the generate schema from the provider’s live reference before enabling any owner-generation form.

## Live Credential Validation Note

The secure key was successfully validated against the documented authenticated customer-library endpoint. The account currently returns an empty `characters` collection and an empty `digitalTwins` collection. A subsequent call to the documentation-listed `GET /api/v1/characters` endpoint returned the provider error `Unknown endpoint: /api/v1/characters`; it has therefore been deliberately excluded from the application. The pilot uses an explicit owner-approved provider-character mapping instead of assuming a public discovery route exists. No generation, room, text, image, audio, or video call has been made.

The official documentation client bundles its character endpoint UI around a runtime OpenAPI specification rather than exposing the V2 generation-field table in static markup. The published lifecycle remains confirmed—generate, poll `characterGuid`, review, save, then use the durable `characterId`—but the exact generation request body must be read from the authenticated live reference before an owner submission is attempted. The pilot deliberately does not invent or send a character-generation payload.

## V2 Generation Contract Recovered from Official OpenAPI

The provider’s runtime OpenAPI specification confirms that V2 generation requires `nationality`, `ethnicity`, `firstName`, `lastName`, `biography`, and `gender`. It supports an optional ISO `dateOfBirth`, but the documentation states that any supplied date must establish an age of at least 21. The `202` response returns a `characterGuid` for polling; only after owner review, `save`, and a `saved` status does the durable `characterId` become available for rooms and text. MyGF.ai retains the stricter product rule that all mapped companion worlds are clearly fictional adults aged `21+` and that no unreviewed generation can enter the public catalog. [1]

## Reference

[1]: https://api.oh.xyz/openapi.json "OhAPI official OpenAPI specification"
