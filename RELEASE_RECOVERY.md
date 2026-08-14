# Published Release Recovery Record

The canonical published MyGF.ai pre-launch release is available at **https://mygfai-prel-lqtcp7hs.manus.space/**. It was verified on **14 August 2026** and corresponds to the project checkpoint `827aed2d`.

The private GitHub recovery repository is [limitlessaiel/mygf-ai-prelaunch](https://github.com/limitlessaiel/mygf-ai-prelaunch). The earlier immutable milestone references are `backup/m1-foundation-20260814`, `backup/m2-violet-landing-20260814`, `backup/m3-beta-interest-20260814`, and `backup/m4-verified-release-20260814`, each created as both a remote branch and annotated tag.

The default rollback target before further product work begins is now established with the following identifiers:

| Recovery layer | Identifier |
| --- | --- |
| Project recovery checkpoint | `0dd06544` |
| Immutable Git release tag | `release/published-20260814` |
| Dedicated Git recovery branch | `recovery/published-20260814` |
| Git backup remote | `https://github.com/limitlessaiel/mygf-ai-prelaunch.git` |
| Canonical production URL | `https://mygfai-prel-lqtcp7hs.manus.space/` |

Use the checkpoint for managed-project rollback and the Git recovery branch or release tag for source recovery. Treat these references as immutable; future work should start on a new branch and never rewrite them.

## Zero-Overlay Redesign Baseline

Before the consumer-first zero-overlay redesign, the existing six-companion media experience was preserved in project checkpoint **`d02a6b36`**. This is the immediate rollback target for the current redesign work. To return to the prior companion-media presentation, restore checkpoint `d02a6b36` through project version history; it retains the managed portrait mappings, fictional adult labels, beta-interest behavior, and all earlier recovery references.

## Final Zero-Overlay Consumer Redesign

The completed zero-overlay consumer redesign is preserved in project checkpoint **`5c1bae97`**. It presents all six companion portraits as unobstructed image-only frames, moves profile metadata and calls to action into separate colorful dossiers, and retains the beta-interest flow and product boundaries. To undo this redesign while keeping the earlier portrait integration, restore checkpoint **`d02a6b36`**. To return to the original pre-media implementation, restore checkpoint **`b59f336e`**.

## Catalog-Redesign Baseline

Before the scalable discovery catalog refactor, the current zero-overlay consumer experience was preserved in project checkpoint **`e8a5bc97`**. Restore checkpoint `e8a5bc97` to revert the catalog work while retaining the documented zero-overlay consumer redesign and its companion-media integration.

## Scalable World-Library Catalog

The completed search-forward catalog redesign is preserved in project checkpoint **`6236a159`**. It adds the original discovery rail, collection banner, world-type, adult-age, and energy filters, live result count, no-result reset, and browser-tested catalog interactions while retaining fully unobstructed portrait frames. To revert the catalog redesign, restore checkpoint **`e8a5bc97`**.

## High-Density Catalog Translation Release

The refined original MyGF.ai consumer catalog is preserved in project checkpoint **`ac7262f7`**. It introduces a uniform four-column desktop browsing field, eighteen clearly adult fictional companion worlds, six supplied portraits in fully unobstructed image-only frames, twelve explicitly labeled CSS-only abstract world previews, compact search and filters, and a separate non-portrait thread note. The existing private-beta capture, duplicate protection, and owner notification flow remain in place.

To revert this release while retaining the archive research and translation specification, restore the immediate pre-refactor baseline **`75597613`**. The earlier scalable World Library remains available at **`6236a159`**, and the protected pre-catalog baseline remains **`e8a5bc97`**. The release was verified with TypeScript, seven Vitest tests, a production build, desktop and mobile catalog automation, beta-interest first-time/duplicate browser checks, visual review, and runtime-log review.

## Compact Portrait-Card Correction

The user-prioritized compact card correction is preserved in project checkpoint **`1b85bd66`**. It replaces the oversized colorful companion dossiers with a uniform four-column, portrait-first browse grid: every world now has a clean 3:4 image-only frame followed by an approximately `82px` compact metadata strip. All portrait pixels remain unobstructed; mood copy, quotes, on-card calls to action, and the editorial interruption were removed from the catalog face to restore fast scanning density. The six supplied portrait files load eagerly alongside the CSS-only abstract world previews.

To undo this correction and return to the prior high-density catalog implementation, restore checkpoint **`6176f7e9`**. The compact-card release retains the prior filter controls, adult-only fictional-AI boundary, private-beta persistence, duplicate handling, and owner notification behavior. It was validated with TypeScript, seven Vitest tests, production build, desktop/mobile catalog automation, beta-interest first-time/duplicate browser checks, visual review, and runtime-log review.

## Transparent White-Text Overlay Catalog

The corrected reference-led companion catalog is preserved in project checkpoint **`718fb44e`**. It removes the compact colored dossiers entirely and restores a single, fixed 3:4 portrait card per world. A restrained transparent dark gradient supports compact white category, adult-age, name, and world-title text directly inside the lower portion of every card. The desktop grid remains four columns, mobile cards remain readable, and the search, category, adult-age, and energy controls are unchanged.

To return to the immediately previous compact dossier implementation, restore checkpoint **`ac701403`**. This release also includes `OHAPI_INTEGRATION_RESEARCH.md` and `OHAPI_IMPLEMENTATION_BLUEPRINT.md`, documenting a secure text-first provider integration path. No OhAPI secret, live character, room, text, media request, or customer content is contained in this release. It was verified with TypeScript, seven Vitest tests, desktop/mobile catalog automation, beta-interest first-time/duplicate browser checks, production build, and runtime-log review.

## Live OhAPI Text Pilot

The first live-model milestone is preserved in project checkpoint **`8cc66895`**. It includes the server-only OhAPI boundary, migrated approved-character, room, message, and job tables, an owner-approved Sienna Vale provider mapping, explicit per-user provider-room context, and an authenticated text-first pilot interface. The owner validation created exactly one account-owned Sienna room with a selected `male` context and persisted one non-explicit prompt-response pair. No image, audio, video, or public user conversation was generated.

Restore checkpoint **`dd47df6b`** to return to the secured pilot foundation before the live Sienna character, mapping, and room test. Restoring a project checkpoint changes source and managed-project state only; it **does not delete remote provider characters, provider rooms, or database records**. The live provider character and owner test room must therefore be treated as retained operational records, and no secret is included in this recovery document.

## Live Pilot Error-Coverage Refresh

The final live-pilot recovery state is preserved in project checkpoint **`2880a04e`**. It retains the approved Sienna Vale mapping and owner test room from `8cc66895`, and adds deterministic checks proving that provider `400`, `401/403`, `429`, and generic upstream failures are translated into product-safe messages without raw provider details or secrets. The complete deterministic test suite now reports fifteen passed tests with one intentional live-network probe skipped; the production build also passes.

Restore checkpoint **`8cc66895`** to return to the live-pilot state before the additional error-mapping test coverage. As with all provider integrations, managed-project rollback does not reverse existing remote provider or database records.

## Controlled Text-Beta Milestone

The controlled-beta implementation is preserved in project checkpoint **`c1e58c36`**. It adds user-owned local thread titles and clear controls, private report storage, an eight-message-per-account-per-UTC-hour server-side limit, product-safe rate-limit feedback, and owner-only preparation for the next clearly adult fictional candidate, Camille Rowan. The existing Sienna provider mapping remains the only approved live companion; no second provider candidate has been generated or published.

The beta controls were verified through owner-path rename, private report persistence, local transcript retirement, database-backed allowance persistence, desktop/mobile review, authorization coverage, eighteen deterministic tests with one intentional live-network probe skipped, production build, and runtime-log review. The dedicated synthetic report and rate-limit records used during validation were deleted after their checks passed. Restore checkpoint **`bbe757c1`** to return to the pre-beta-control live-pilot state. Managed-project rollback does not reverse existing provider characters, provider rooms, or database records.

## OhAPI Contract and Recovery Hardening

The official-documentation alignment milestone is preserved in project checkpoint **`b6571c8e`**. It requires a provider-confirmed `saved` draft status and an exact matching durable `characterId` before the owner may map a newly generated candidate. It also adds safe, bounded retries only for transient failures on read-only provider requests, plus the authoritative `OHAPI_API_COMPLIANCE_AUDIT.md` and `GITHUB_BACKUP_OPERATING_STANDARD.md` records.

The corresponding immutable source references are **`backup/ohapi-contract-audit-20260814`** and **`recovery/ohapi-contract-audit-20260814`**. Restore checkpoint **`c1e58c36`** to return to the prior controlled-beta implementation before this contract hardening. As with every provider-related checkpoint, restoring application source does not change existing remote provider or database records.

## OhAPI Studio and Isolated Playground Consolidation

The production-safe Studio and isolated-playground consolidation is preserved in project checkpoint **`3142a5dd`**. It includes the reviewed `tools/oh-api-playground/` package, an owner-only `/ops/ohapi` Studio, sanitized operation auditing for candidate generation, save, and approved mapping actions, the `ohapi_admin_audits` migration, and an automated guard against importing the browser-local BYOK package into production source.

The corresponding immutable source references are **`backup/ohapi-studio-consolidation-20260814`** and **`recovery/ohapi-studio-consolidation-20260814`**. Restore checkpoint **`8991ebff`** to return to the exact state before the playground source was reconciled. Restoring an application checkpoint does not delete provider characters, rooms, or other remote provider records; no new provider content was created for this milestone.

## Live Access and Sienna Readiness Transition

The live-access transition is preserved in project checkpoint **`627ccb6f`**. It replaces every public beta-interest and request-access call to action with private access, presents a branded account gate before OAuth begins, and removes the global unauthorized-query redirect that previously skipped that explanation. The public flow now explains that an account protects room ownership, transcript controls, reports, and per-account limits.

This checkpoint also records the verified Sienna state: the provider account contains one saved character, and the local mapping points `sienna-vale` to provider ID `21555`; however, the existing provider identity is not yet aligned with the public Sienna concept. The owner Studio therefore displays an explicit **identity review required** hold. `SIENNA_READINESS_STANDARD.md` defines the required final identity, visual, and representative-thread approvals. No provider character or content was generated, saved, mapped, or published during this transition.

The corresponding immutable source references are **`backup/live-access-sienna-readiness-20260814`** and **`recovery/live-access-sienna-readiness-20260814`**. Restore checkpoint **`9aea73c3`** to return to the prior Studio consolidation before the public live-access and Sienna-readiness corrections.

## Provider-Backed Companion Product

The technical pilot was replaced with a companion product whose catalog is
derived from the provider library.

**Rollback target:** restore checkpoint / branch `recovery/live-access-sienna-readiness-20260814`
(`eb8003a`) to return to the pre-rebuild landing page and `/pilot` surface.

What changed:

- `server/ohapi.ts` was corrected against the published documentation. The chat
  call previously posted `{ room_id, prompt }`; the documented contract is
  `{ room_id, character_id, message }`. Room creation previously sent
  `user_gender` and `texting_style`, which the documented contract does not
  define. `server/ohapiContract.test.ts` now locks every request shape.
- The public catalog is synced from `GET /api/v1/characters` into
  `ohapi_characters` rather than hard-coded in the client. Eighteen fictional
  entries, of which one had a provider mapping, were removed.
- Clicking a companion now opens that companion. Routes are `/companion/:slug`
  and `/chat/:slug`; `/pilot` is removed and redirects to `/companions`.
- Image, audio, and video generation were implemented as typed server-mediated
  operations with per-account ownership on every job.
- Adult confirmation moved from a browser checkbox to a stored account timestamp
  enforced by `server/ohapiAccess.ts` on every generative request.
- The message allowance is consumed before a provider room is created, and room
  creation is separately bounded, closing the unbounded clear-then-send loop.
- Owner companion-creation controls moved off the customer page into `/ops/ohapi`.
- The unused public `betaInterest.submit` endpoint was removed.

Migration `drizzle/0007_flippant_the_spike.sql` adds adult confirmation, companion
registry metadata, and media-job ownership. `ohapi_media_jobs.userId` is added
`NOT NULL`; this is safe because no code path ever wrote to that table.

Superseded documents removed in this change: `OHAPI_API_COMPLIANCE_AUDIT.md`,
`SIENNA_READINESS_STANDARD.md`, `LIVE_ACCESS_AUDIT.md`, `BETA_PILOT_GUARDRAILS.md`,
`CATALOG_ARCHITECTURE.md`, `COMPACT_CARD_CORRECTION.md`, `COMPANION_ROSTER.md`,
`HIGH_DENSITY_CATALOG_TRANSLATION.md`, `REFERENCE_MAP_IMPLEMENTATION.md`, and
`TRANSPARENT_OVERLAY_CATALOG_CORRECTION.md`. They described a landing page and
pilot surface that no longer exist, and three of them stated mutually
contradictory rules for the same card treatment. They remain recoverable from Git
history. `OHAPI_INTEGRATION.md` and `PRODUCT_MODEL.md` replace them.

### Repository reference correction

`git ls-remote origin` resolves this repository to
`https://github.com/giovancarl444/mygf-ai-prelaunch`, not the
`limitlessaiel/mygf-ai-prelaunch` recorded in the earlier entries above and in
`GITHUB_BACKUP_OPERATING_STANDARD.md`. All 15 `backup/*` tags, 12 `recovery/*`
branches, and `release/published-20260814` were verified present on that remote.
The historical entries are left unedited; whether this reflects a rename or a
mistaken record needs owner confirmation.
