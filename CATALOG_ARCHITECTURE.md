# Scalable Companion Catalog Architecture

The discovery experience will be treated as a **world library**, not a dating-profile grid. It will use the same high-level browsing strengths observed in the supplied research—persistent discovery context, a strong collection banner, a search-forward filter strip, and a dense long-list rhythm—without reproducing its branded UI, content, or image-overlay treatment.

| Catalog layer | MyGF.ai implementation | Scaling behavior |
| --- | --- | --- |
| Discovery rail | A compact “World library” context panel containing live count, section anchors, collection highlights, and a private-beta notice. | Can add saved worlds, recently viewed worlds, and new collections without changing card layout. |
| Collection banner | A colorful non-portrait “Tonight’s directions” collection header. The user may replace its graphic later with a branded asset. | Supports seasonal campaigns and featured editorial collections. |
| Search | Full-text local search across fictional name, world title, category, mood, and personality keywords. | Replaces with server-side indexing when a larger catalog ships. |
| Category rail | World type, age range, and energy filters presented as compact chips/dropdowns. | Derived from catalog metadata; no layout change when categories expand. |
| Result grid | A responsive long list with varied but deterministic feature placement. | New companion entries automatically participate in grid ordering and filters. |
| Media rule | Portraits appear only in image-only frames. All age, fictional-AI disclosure, world title, text, and actions render outside the media frame. | Applies identically to every current and future companion. |

## Initial Taxonomy

The first catalog ships with four world types: **Reflective**, **Story**, **Imaginative**, and **Curious**. The user-facing energy filter uses **Bright**, **Grounded**, **Composed**, and **Adventurous**. The adult-only age control is limited to **21–24**, **25–29**, and **30+**. These controls are fictional profile metadata and never claims about an individual pictured in a supplied asset.

## Interaction Contract

Search and all filter controls can be combined. “Clear filters” restores the full list. A count label describes how many fictional worlds are currently visible. A no-result state provides a single clear action to reset filters. Each companion’s entry action continues to route to the existing private-beta interest form until actual companion-detail routes are introduced.

## Non-Negotiable Boundaries

Every present and future result must remain a clearly adult fictional AI companion, preserve explicit AI disclosure, avoid false human-presence or therapeutic claims, and use the zero-overlay portrait media system.
