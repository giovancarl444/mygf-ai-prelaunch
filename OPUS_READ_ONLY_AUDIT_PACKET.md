# Opus Read-Only Audit Packet — MyGF.ai

## Role and Operating Mode

Act as an independent principal product engineer and security-minded technical reviewer. Audit this repository **read-only**. Your job is to expose incorrect product assumptions, misleading customer journeys, implementation gaps, security boundary problems, and recovery weaknesses—not to make code changes.

> Do not edit files, run migrations, call OhAPI, create provider content, alter database records, install dependencies, publish, push Git, create commits/tags/branches, or use `git reset`. Do not reveal environment values, tokens, cookies, or other secrets.

Repository: `limitlessaiel/mygf-ai-prelaunch`  
Primary product URL: `https://mygfai-prel-lqtcp7hs.manus.space/`

## Situation You Must Evaluate

MyGF.ai is intended to become a real adult AI-companion product, but it is not ready to imply that public companion cards are complete live companion products.

The public landing page currently displays a discovery catalog including **Sienna Vale**. Clicking a card routes to `/pilot`, a technical private-text pilot. `/pilot` has an explicit sign-in gate for unauthenticated visitors and, for the owner, exposes both the text-pilot workspace and owner companion-setup controls. `/ops/ohapi` is a separate owner-only operational Studio.

The provider integration itself is real and server-side. It follows the documented generation lifecycle: private candidate → `ready` → owner review → explicit save → provider-confirmed `saved` with durable `characterId` → mapping. The existing local Sienna mapping points to provider ID `21555`, and a read-only customer-library check returned one saved provider character. However, the saved provider candidate was documented as a **28-year-old independent cultural editor**, while public marketing currently describes/shows a separate **24-year-old bright/playful Sienna**. Therefore, technical mapping exists but identity alignment does not.

The current intended truth is:

| Surface | Intended role | Current concern |
| --- | --- | --- |
| `/` | Public marketing and discovery | Cards currently imply an immediately usable world but route to a technical pilot. |
| `/pilot` | Account-owned private text workspace | It is still a technical pilot, and owner controls are co-located beneath the customer workspace. |
| `/ops/ohapi` | Owner-only operational Studio | Correctly separate from customers, but needs to remain explicitly non-customer-facing. |
| `tools/oh-api-playground/` | Isolated private BYOK development utility | Must never be imported by the production application or use its server credential. |

## Verified Constraints

1. **Never expose `OHAPI_API_KEY`** to browser code, client bundles, logs, Git, or user-facing error messages.
2. **No generic provider proxy.** The production app may expose only reviewed, typed server operations.
3. **No provider mutation in this audit.** Do not generate, save, map, open a room, send text, or request media.
4. **No public Sienna claim until identity is aligned.** A saved technical mapping is not launch approval.
5. **Explicit room context only.** The user chooses `male` or `female`; do not infer it.
6. **Account ownership matters.** Rooms, rate limits, reports, rename, and local clear rely on authentication. The product may explain sign-in, but must not silently send a visitor away before that explanation.
7. **Public portrait constraint:** supplied companion portraits must remain visually unobstructed; no dark/image overlay or text overlay may cover portrait pixels.
8. **No fabricated reviews, ratings, or testimonials.**
9. **Recovery discipline:** managed checkpoints plus GitHub tags/recovery branches are required. Never rewrite historical recovery references.

## Files to Inspect First

Read these before forming conclusions:

| Purpose | Files |
| --- | --- |
| Public journey | `client/src/pages/Home.tsx`, `client/src/index.css`, `client/src/App.tsx` |
| Access behavior | `client/src/pages/Pilot.tsx`, `client/src/pages/Pilot.css`, `client/src/main.tsx`, `client/src/_core/hooks/useAuth.ts`, `client/src/const.ts` |
| Owner operations | `client/src/pages/OhapiStudio.tsx`, `server/ohapiStudio.ts`, `server/ohapiPilot.ts` |
| Provider boundary | `server/ohapi.ts`, `server/ohapiDb.ts`, `drizzle/schema.ts` |
| Governing records | `OHAPI_API_COMPLIANCE_AUDIT.md`, `SIENNA_READINESS_STANDARD.md`, `LIVE_ACCESS_AUDIT.md`, `RELEASE_RECOVERY.md`, `GITHUB_BACKUP_OPERATING_STANDARD.md` |
| Regression coverage | `server/liveAccessCopy.test.ts`, `server/playgroundIsolation.test.ts`, `server/ohapiPilot*.test.ts`, `server/ohapiStudio.test.ts` |

## Required Audit Procedure

First, establish the source state with read-only commands such as `git status --short`, `git log --oneline -12`, `git branch -a`, `git tag --list`, and `git remote -v`. Inspect the files listed above. You may run `pnpm check`, `pnpm test`, and `pnpm build` if they do not alter tracked source. Do not treat a passing build as product validation.

Then produce a written review with exact file references and a strong distinction between **verified fact**, **inference**, and **recommendation**.

## Required Output

Provide the following seven sections. Be direct; do not soften material findings.

1. **Executive truth:** In five sentences or fewer, state exactly what customers can do today, what the provider integration proves, and what it does not prove.
2. **Route-and-surface map:** Trace every public click path from a companion card through authentication and into customer or owner surfaces. Label each step as public customer, authenticated customer, owner-only, or development-only.
3. **Critical mismatch list:** Rank the ten most important issues by severity. Include misleading product framing, character identity mismatch, potential owner/customer co-location, access/auth behavior, and any security/recovery concern found in source.
4. **Sienna launch-gate assessment:** Evaluate the current Sienna state against a concrete launch checklist: provider lifecycle, identity, visual truthfulness, conversation review, owner sign-off, customer journey, privacy/account controls, and rollback readiness. For each, state pass/fail/unknown and cite evidence.
5. **Target product model:** Recommend exactly one coherent model for the next milestone. It must answer: What happens when a public visitor clicks a world? When does sign-in occur? What does a signed-in customer see? Where do owner controls live? What is unavailable until Sienna is truly approved?
6. **Implementation plan, not code:** Propose an ordered, minimum-safe set of changes. Separate “must happen before Sienna public launch,” “can happen after launch,” and “must not be built yet.” Flag provider-side steps that require explicit owner approval.
7. **Recovery and security verdict:** State whether the existing checkpoints, Git tags/branches, secret boundary, and isolated playground are sufficient for the next milestone. Name any required improvement before code changes resume.

## Decision Rule

Do **not** recommend more visual polish, analytics, extra companions, media, monetization, or broad user invitations until you have resolved the fundamental answer to this question:

> Is MyGF.ai currently a public product with a real launch-ready Sienna, or a marketing shell around a controlled technical pilot—and therefore what must change before the product can truthfully behave as live?

Return the final review as Markdown with a concise decision at the top. Do not change the repository.
