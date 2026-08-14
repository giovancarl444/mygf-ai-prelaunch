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
