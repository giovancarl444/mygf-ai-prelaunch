# Live Access and Sienna Readiness Audit

**Audit date:** 14 August 2026

## Confirmed Access Behavior

The current public landing page is still configured as a pre-launch experience. Its header, hero, catalog cards, collection banner, and lower call to action all route to a private-beta interest form rather than a live product entry.

The public `/pilot` and private `/ops/ohapi` routes use the existing authenticated-account gate. When an unauthenticated visitor opens either route, the application intentionally redirects to the Manus account chooser. This is the screen the owner described as a signup screen. It is an account-authentication flow, not the stored beta-interest form, and it exists because threads, rate limits, reports, and local transcript controls are account-owned.

> The live-product transition should remove beta-interest capture and replace “request access” with a clear “start your private thread” entry path. It should retain a clearly labeled sign-in step before a private, account-owned conversation begins; removing authentication entirely would weaken room ownership, transcript control, and the per-account safety limit.

## Confirmed Sienna State

| Evidence | Confirmed fact |
| --- | --- |
| Local approved-character record | `sienna-vale` is locally approved and maps to provider character ID `21555`. |
| Provider lifecycle contract | OhAPI requires generate → `ready` → explicit save → `saved` → durable `characterId` before a character is used in rooms or text. [1] |
| Read-only provider check | The authenticated customer-library endpoint returned exactly one saved character on 14 August 2026. This confirms the provider account remains reachable and populated without generating or modifying content. |
| Local room state | The single owner verification room is retired after local clear; no local message remains. |
| Provider identity limitation | The existing local mapping proves a saved provider character was linked, but it does **not** establish that its current provider profile, generated appearance, and written identity match the Sienna Vale brand direction. |

## Immediate Product Conclusion

Sienna is technically connected as the sole enabled text world, but she is **not product-ready** until the owner reviews and accepts her provider profile and visual/identity fit against an explicit Sienna readiness standard. No provider content was created or changed during this audit.

## Reference

[1]: https://api.oh.xyz/documentation "OhAPI API Documentation"
