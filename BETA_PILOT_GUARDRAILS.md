# MyGF.ai Text Pilot Guardrails

## Controlled-Beta Policy

The first live model access remains **text-only**, authenticated, and limited to owner-approved adult fictional companion worlds. Every room stays bound to one MyGF.ai account and one approved provider character. The provider-room context is always an explicit selection; the product must not infer it from profile details, browsing, or a companion choice.

| Control | Pilot decision | User-facing effect |
| --- | --- | --- |
| Text limit | Eight attempted text turns per account per rolling UTC hour. | A clear retry time is shown before an external request is made. |
| Thread name | Account owners can rename their local conversation. | A short title helps distinguish their own threads. |
| Clear thread | The local transcript is removed and the next message starts a fresh provider room. | The UI explains that this clears MyGF.ai’s stored transcript; provider retention is governed separately. |
| Report | A signed-in user can report a conversation or one stored message for safety or quality review. | Reports are private, timestamped, and never displayed to other users. |
| Provider failure | Upstream errors are mapped to product-safe copy. | Raw provider error bodies, identifiers, and secrets are never shown. |

## Data Boundaries

The application stores only the local title, room ownership record, local transcript, report metadata, and rate-limit counters necessary to operate the beta. A user’s clear-thread action removes the stored MyGF.ai messages and retires the linked local room state; it does not claim to erase a third-party provider’s retained service records. The product must say this plainly wherever the clear action is offered.

## Owner Expansion Rule

The second companion must follow the same owner-only lifecycle: create a private provider draft, review it as a clearly adult fictional character, explicitly save it, map the durable provider ID, and only then expose it to authenticated pilot users. No draft, generated media, or unreviewed provider content is public.
