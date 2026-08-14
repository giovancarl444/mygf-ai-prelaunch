# Oh API Playground — Design Directions

## Three possible approaches

### 1. Console Atelier
**Very Brief Intro:** A tactile creator console that blends the clarity of a professional control room with a subtle, expressive purple-and-orange art direction. It makes API experimentation feel deliberate rather than intimidating.

**Probability:** 0.07

### 2. Signal Library
**Very Brief Intro:** A restrained editorial interface inspired by research catalogs, with generous breathing room, document-like panels, and small bursts of vivid signal color.

**Probability:** 0.04

### 3. Aperture Studio
**Very Brief Intro:** A cinematic workspace built around image frames, deep contrast, and dynamic visual surfaces, intended to make media-generation testing feel like working in a post-production suite.

**Probability:** 0.09

---

# Chosen approach: Console Atelier

## Design Movement

**Neo-brutalist product craftsmanship** softened with cinematic, low-light materiality. The interface should feel like an advanced creative instrument: precise, responsive, and intentionally authored rather than conventionally corporate.

## Core Principles

1. **Operational clarity first.** Every request state, required field, and output is legible immediately, using strong hierarchy rather than visual clutter.
2. **A textured dark canvas.** Black-plum surfaces, barely-there grain, and layered panel shadows create depth without relying on gradients as decoration.
3. **Accent colors carry meaning.** Orange marks actions and live moments; purple frames identity, selection, and the expressive side of the API.
4. **Asymmetric rhythm.** A fixed left navigation rail and a broader working stage are divided by purposeful vertical seams, with character panels and result panels creating a studio-like flow.

## Color Philosophy

The visual foundation uses **#0f0a10** as a warm near-black rather than a sterile charcoal, with **#1a0d1c** and **#110113** forming receding layers. **Signal Orange (#fc7a1d)** is reserved for committing actions, status indications, and loading activity, which makes the interface feel active without always being loud. **Orchid Purple (#913CDD)** defines current context, character identity, and selected states. Pale lilac and muted mauve are used only for legibility and supporting detail.

## Layout Paradigm

The app follows a **rail-to-stage composition** rather than a centered dashboard grid. On desktop, the navigation rail is a fixed composition column; the API key strip acts as a narrow instrument panel; and the working stage is split into an input/selection bench and a larger execution/output surface. On mobile, the rail collapses into a compact top control and the working surfaces stack in the same order users work: configure, select, request, inspect.

## Signature Elements

1. **Cut-corner instrument panels** with a small clipped notch in the upper-right corner, used on primary work surfaces and selected character cards.
2. **A vertical orange signal rule** next to active labels, selections, and the current API mode.
3. **Micro-grid texture and small coordinate marks** in panel headers, evoking a carefully calibrated creative workstation.

## Interaction Philosophy

Interaction must feel quick and confirmatory. The active tab changes the entire work surface while retaining the current key and available characters. Buttons depress slightly, selections use a short orange line sweep, and API outcomes are treated as composable “result artifacts” rather than anonymous alerts. Failed requests show the endpoint and backend message in a quiet but unmistakable diagnostic panel.

## Animation

Transitions use an assertive **cubic-bezier(0.23, 1, 0.32, 1)** curve and generally last 160–220ms. Panel changes crossfade with a 6px vertical movement, character cards lift by 2px on hover, and generation states use a subtle orange scan line rather than a large spinning loader. Nothing loops aggressively except a restrained status indicator; all non-essential motion is suppressed for reduced-motion preferences.

## Typography System

**Space Grotesk** is the display and interface headline face, used in weighted uppercase or title case labels for deliberate technical character. **DM Mono** is used for endpoints, job states, API keys, metadata, timestamps, and diagnostic output. The hierarchy favors compact but legible titles, with metadata at 11–12px tracking slightly wider than normal. No Inter is used.

## Brand Essence

**Oh API Playground is the instrument panel for creators and developers who want to test character-driven AI media with direct, inspectable control.**

Personality: **precise, expressive, composed**.

## Brand Voice

Headlines are specific, assured, and action-oriented; CTAs tell users precisely what will happen; microcopy speaks like a capable collaborator and avoids vague marketing language.

Example lines:

> Choose a character. Observe the response.

> Send a live request — your key stays in this browser.

## Wordmark & Logo

The mark is an **open-ring aperture** formed from two offset orange and purple brackets, suggesting both “Oh” and an interface portal. It is placed beside a custom-spaced, compact “OH / PLAYGROUND” wordmark using Space Grotesk; the bold mark can stand alone in constrained areas and as the favicon.

## Signature Brand Color

**Signal Orange — #fc7a1d** is the ownable action color and must appear only when it communicates activity, selection, or a meaningful next step.

## Style Decisions

- The desktop rail is a persistent, visible composition column carrying the aperture mark, compact wordmark, primary navigation, and browser-local connection status.
- Every primary work surface uses the clipped corner treatment and a mono coordinate mark. An orange vertical rule is reserved for the currently active execution surface or an action that requires attention.
- Operational microcopy names the actual step being performed, such as selecting a character, staging a key, sending a request, or inspecting a result.
