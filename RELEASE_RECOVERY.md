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
