# Oh API Playground

This is an **isolated internal developer tool** for inspecting Oh API request contracts with a user-provided API key. It is intentionally separate from the MyGF.ai customer application and must not be linked in public navigation or imported into the parent application.

The playground performs requests directly from the browser and saves the supplied key only in that browser’s local storage. It does not contain, load, or require the parent application’s `OHAPI_API_KEY`. Never commit API keys, browser storage exports, generated media, request logs, or user data.

## Local use

Install and run the tool independently from this directory:

```bash
pnpm install
pnpm dev
```

For a production check, run:

```bash
pnpm check
pnpm build
```

## Boundary with MyGF.ai

The public MyGF.ai application follows a different security model: it keeps provider credentials, provider room IDs, authorization, rate limits, and audit records on the server. This playground is suitable for private development and provider-contract exploration only; it is **not** a customer-facing integration path.

## Scope

The initial build supports direct testing for character discovery, room-based chat, asynchronous image/video/audio jobs, and Cam session creation. It surfaces response diagnostics and uses a five-minute polling limit for asynchronous jobs.


## Verified endpoint notes

Checked against the live service on 14 August 2026:

- Audio is `POST /api/v1/audio/notes`. The documented `/api/v1/audio` returns
  `403 Unknown endpoint`.
- The **Cam tab does not work.** Every documented Cam path returns
  `403 Unknown endpoint` on this account.
- `GET /api/v1/characters` does not exist either; `customer-library` is the real
  listing, and it returns `characterId` as a number with `firstName` / `lastName`
  / `sfwImage`.

See `OHAPI_INTEGRATION.md` in the repository root for the full contract.
