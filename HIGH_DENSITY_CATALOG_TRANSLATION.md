# MyGF.ai High-Density Catalog Translation

## Purpose

This specification translates the supplied visual research into an **original MyGF.ai consumer-discovery experience**. It is not a reproduction plan. The work adopts only durable interaction and information-architecture ideas: persistent discovery context, search-led browsing, a compact filter system, and a long, predictable card list. MyGF.ai’s identity, language, companion records, colors, controls, and trust boundaries remain independent.

> **Non-negotiable media rule:** A companion portrait is always an image-only frame. No name, age, gradient, badge, CTA, hover treatment, or other visual overlay may cover portrait pixels. Every descriptor belongs in a separate adjoining dossier.

## Translation Matrix

| Research pattern | Original MyGF.ai translation | Explicit difference |
| --- | --- | --- |
| Persistent consumer-discovery context | Sticky top navigation plus a contextual World Library rail on wide screens; a horizontal utility strip on smaller screens. | MyGF.ai uses its own dark violet-neon system, world-oriented labels, and privacy-first actions. |
| Long, dense portrait-driven result field | A four-column desktop grid of consistently proportioned cards, moving to three, two, and one columns at smaller breakpoints. | Each card is an original companion-world record; dossier metadata sits outside image frames. |
| Search and compact category controls | One prominent search field, compact dropdown facets, category chips, and a live result count. | Controls use MyGF.ai taxonomy: world type, adult age group, and energy. |
| Occasional editorial interruption | A single original non-portrait “Thread note” tile may appear after a measured number of results. | The tile is not a promotion, does not replicate media entertainment modules, and never impersonates a companion card. |
| Action after browsing | A concise private-beta handoff remains available from each dossier and the existing conversion band. | No direct companion creation, no copied product language, and no claim that a companion is human. |
| FAQ and lower-page close | Existing MyGF.ai FAQ, trust content, beta form, and footer retain their locations after the catalog. | Copy remains factual: adult AI, user-controlled memory, and privacy-by-design intent. |

## Catalog Geometry

The catalog must feel like a library that can legitimately grow, not a six-card editorial showcase. Desktop result cards use one consistent vertical orientation. The portrait area uses a 3:4 aspect ratio, and the adjacent dossier immediately follows under the frame. On desktop, a card should not expand into a side-by-side “feature” layout; uniform dimensions keep fast scanning intact. The primary density target is four ordinary cards per row at widths above 1180 pixels, with `18–20px` gaps and dossiers trimmed to essential metadata.

| Viewport | Result grid | Catalog rail | Card behavior |
| --- | --- | --- | --- |
| `>1180px` | Four columns | Sticky vertical rail | Portrait above dossier; stable compact height. |
| `860–1180px` | Three columns | Horizontal utility strip | Same image-only media frame; no reordering of metadata. |
| `620–859px` | Two columns | Horizontal utility strip | Search retains full-row width; filters follow in two columns. |
| `<620px` | One column | Horizontal utility strip | Media remains image-only; dossier follows in reading order. |

## Companion Record Contract

Every catalog record must satisfy the existing verified filter contract and include original product content. The first six existing supplied portraits retain their specific adult fictional identities. Additional records will be clearly indicated as **original abstract world previews**, rendered with CSS-only gradient art, not human photography and not a substitute for supplied portraits.

| Field | Requirement |
| --- | --- |
| `name` | Original fictional adult character name. |
| `age` | Numeric and at least 21. |
| `category` | One of Reflective, Story, Imaginative, or Curious. |
| `energy` | One of Bright, Grounded, Composed, or Adventurous. |
| `tag` | Original concise world-title or collection phrase. |
| `mood` | Original one-line fictional world cue, without false-presence or therapeutic claims. |
| `line` | Short imaginative starting cue, never a claim of human feelings or real-world relationship. |
| `image` / `art` | Either an existing managed portrait URL or a CSS-only gradient-art designation. |

## Dossier Content Order

The dossier is intentionally compact. It must preserve scanability and the adult-AI boundary without replicating text-over-photo card conventions.

1. **World type** and **adult age** appear in a thin metadata line.
2. **Name** and short **world title** establish identity.
3. One concise **mood** line gives browsing context.
4. The first-line cue is visually secondary and may be omitted at narrow card widths.
5. The footer line states **Fictional AI** and provides the existing **Request beta** action.

## Research-Informed Boundaries

MyGF.ai will not use the reference brand, naming, logo system, copy, sales claims, subscription copy, cookie interface, badges, character concepts, text-over-image convention, or promotional tile arrangement. The catalog will not imply that any fictional character is real, human, emotionally present, a replacement for people, or a therapeutic service. All companion ages remain `21+`.

## Acceptance Criteria

| Criterion | Verification |
| --- | --- |
| Portraits have no visual overlay | Desktop and mobile screenshot review plus DOM/CSS inspection. |
| Additional CSS-only records are visibly distinct from real portrait records | The art frame carries an “Abstract world preview” label in the **dossier**, never on the media. |
| Filters remain combinable and resettable | Existing UI automation plus Vitest filter coverage. |
| Catalog uses high-density, stable dimensions | Desktop screenshot demonstrates four columns of uniform portrait+dossier cards. |
| Required exact copy remains | DOM/text review for hero, trust labels, how-it-works labels, selector options, and footer disclaimer. |
| Beta-interest behavior remains intact | Existing first-time and duplicate browser checks plus server tests. |

