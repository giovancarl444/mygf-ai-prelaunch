# OhAPI Contract and Operating Standard

**Audit date:** 14 August 2026  
**Official source:** [OhAPI API Documentation][1]  
**Scope:** The MyGF.ai text-first controlled beta only. No provider character, room, message, image, audio, video, or digital-twin request was issued during this audit.

## Current Operational State

The application currently has one locally approved, provider-mapped companion: **Sienna Vale** (`sienna-vale`). The local system contains no active room, no stored message, no open private report, and no active rate-limit bucket. One retired local room remains as the record of the verified transcript-clear control. This local inventory does not query, alter, or promise to delete provider-retained records.

| Contract area | Required operating rule | Enforced project behavior |
| --- | --- | --- |
| Authentication | Use `https://api.oh.xyz` and send `X-API-Key` on every provider request. [1] | The key is read only in server code. It is never returned from a procedure or embedded in the browser bundle. |
| Character generation | Generate a V2 candidate, poll until `ready`, review it, explicitly save it, poll until `saved`, and use the returned durable `characterId`. [1] | Owner-only controls follow this state sequence. A mapping now requires the matching draft identifier, confirmed `saved` status, and the exact durable provider ID. |
| Regeneration | Each generation produces a separate candidate; save only the reviewed candidate. Saved character images are not regenerated in place. [1] | The product preserves an explicit review-before-save decision and does not overwrite a saved character through the regeneration path. |
| Conversations | Reuse an existing room rather than creating a new room per message so the provider context remains coherent. [1] | The server retrieves an active account-owned local room before it creates a new provider room. |
| Room context | Provider room context must be supplied intentionally at room creation. | The user selects `male` or `female` explicitly. The application never infers it from profile data or the companion. |
| Transient failure handling | Apply bounded retries only where a repeat is safe; the provider advises transient-error handling. [1] | Only safe `GET` requests retry, and only for `429`, `500`, `502`, `503`, and `504`. Side-effecting `POST` operations—including generation, save, room creation, and text—are never automatically retried. |
| Provider errors | Handle documented validation, authentication/access, throttling, and server failures without leaking diagnostics. [1] | User-facing errors are product-safe. Provider response bodies, stack traces, and the API key remain server-side. |

## Owner Character-Approval Rule

> A draft is **not** a MyGF.ai companion. It becomes eligible for mapping only after the provider confirms `status: "saved"` and returns a `characterId` that exactly matches the identifier being approved. [1]

The owner interface now refreshes the provider status after a private candidate is generated and continues status checks after an explicit save request until it reaches a terminal result. The manual mapping control remains disabled unless the saved status and identifier match. The server repeats that check as the authoritative enforcement point, so a modified browser request cannot bypass it.

## Deliberate Beta Boundaries

MyGF.ai currently uses the provider for the documented text-room path only. Images, audio, video, digital twins, provider job polling, and provider-hosted media retention are out of scope for this controlled beta. Any future media implementation must receive a separate design, storage, retention, and safety review before an endpoint is enabled.

The local **Clear** action retires the MyGF.ai room and removes its local transcript. It does not represent a provider-side deletion request, because the existing text beta does not assume such a provider deletion contract. This distinction remains visible in the product.

## Owner Studio and Playground Separation

The private `/ops/ohapi` Studio is available only to the MyGF.ai owner through the existing server-enforced admin procedure. It provides a credential-configuration signal, sanitized local counts, a read-only provider-library refresh, draft-status inspection, and a concise operational ledger. It deliberately does **not** accept a browser key, expose raw provider response bodies, provide a generic request composer, or enable media, Cam, digital-twin, or unrestricted text controls.

Every owner-reviewed provider mutation now records a sanitized local audit outcome. Candidate generation, save requests, and approved mappings record only the owner, action class, relevant provider identifier, success/failure outcome, and an allowlisted detail. API keys, headers, raw upstream errors, and private message content are rejected from this audit record by the persistence helper.

The submitted `tools/oh-api-playground/` package remains a separately buildable, private development utility. It uses a browser-local BYOK model and retains its own package manifest, lockfile, README, and exclusions. The production application contains a regression test that prevents it from importing the package. The Studio therefore centralizes the operational workflow without adopting the playground's browser-key transport model.

## Verification Record

The combined contract and Studio hardening was validated by TypeScript compilation, independent production builds for the main application and isolated playground, desktop/mobile Studio review, authorization and package-isolation tests, and the deterministic suite: **28 passing tests and one intentionally skipped live-network credential probe**. The skipped probe is gated behind `RUN_OHAPI_LIVE_TESTS=true` to prevent routine test runs from accessing the provider.

## References

[1]: https://api.oh.xyz/documentation "OhAPI API Documentation"
