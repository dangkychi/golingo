# GOLingo Design System: Cyber-Linguistic Energy

This document defines the single source of truth for the user interface layout, typography, visual tokens, and component guidelines for the **GOLingo** application.

---

## 1. Visual Theme & Atmosphere

The **Cyber-Linguistic Energy** style is a high-contrast, premium dark mode aesthetic tailored for active EdTech learners. It combines high-tech futuristic details (neon glows, micro-animations, glassmorphism) with clean, high-readability content typography to prevent user fatigue.

*   **Density:** 6/10 (Balanced, ample breathing room around educational content, medium density for lists/management screens).
*   **Variance:** 7/10 (Asymmetric split columns, offset grids, and distinct color accents).
*   **Motion:** 7/10 (Spring-based active states, persistent subtle indicators, and staggered cascade reveals).
*   **Core Feel:** Premium cyberpunk classroom — clean, structural grid foundations accented by glowing digital wires and sharp neon feedback.

---

## 2. Color Palette & Roles

The system uses a dark base (Zinc-950/Slate range) combined with highly saturated neon energy indicators for feedback and interactive elements.

```css
:root, [data-theme="dark"] {
  /* Canvas & Containers */
  --bg-primary: #131318;       /* Primary canvas background */
  --bg-secondary: #1b1b20;     /* Card background & default container surface */
  --bg-tertiary: #1f1f25;      /* Inactive elements, sidebar, secondary surfaces */
  --bg-card: #1b1b20;          /* Card body surfaces */
  --bg-card-hover: #1f1f25;    /* Interactive hover surface */
  --bg-overlay: rgba(14, 14, 19, 0.8);

  /* Typography Colors */
  --text-primary: #e4e1e9;     /* Default high-contrast body & title text */
  --text-secondary: #b9caca;   /* Descriptive text, subheadings, labels */
  --text-tertiary: #849495;    /* Muted text, captions, placeholder values */
  --text-inverse: #131318;     /* Text color when overlaid on bright neon surfaces */

  /* Cyber-Linguistic Neon Accents */
  --neon-cyan: #00f5ff;        /* Primary action color, links, interactive highlights */
  --neon-magenta: #ff4b89;     /* Secondary actions, error states, streak targets */
  --neon-lime: #ccff00;        /* Progress bars, success status, XP milestones */
  
  /* Borders & Dividers */
  --border-primary: rgba(0, 245, 255, 0.15);   /* Glowing structural line */
  --border-secondary: #3a494a;                 /* Structural container dividers */
}
```

*   **Accent Rules:**
    *   Use **Cyan** (`#00f5ff`) for primary interaction indicators, tags, active navigation, and selection states.
    *   Use **Magenta** (`#ff4b89`) for critical actions, negative feedback, deletions, and high-energy highlights.
    *   Use **Lime** (`#ccff00`) exclusively for indicators of positive progress, successfully completed items, streaks, and correct answers.

---

## 3. Typography Architecture

We use clean, geometric sans-serif fonts to maintain a friendly yet technical vibe.

*   **Primary Font (Display/Heading/Body):** `'Quicksand', sans-serif`
    *    approcheable terminals, geometric structure.
    *   *Display Titles:* Semibold/Bold (600/700/800), tight letter-spacing (`-0.02em`), line-height `1.1` to `1.2`.
    *   *Body Copy:* Regular/Medium (400/500), line-height `1.6`, maximum length `65ch` per line to optimize read speed.
*   **Mono Font (High Density):** `'Geist Mono', 'Courier New', monospace`
    *   Used for code blocks, statistics, counts (e.g., word count "1,245 words"), and timeline metrics.
*   **Banned Fonts:**
    *   `Inter` (Strictly BANNED to avoid standard SaaS-slop look).
    *   Generic serifs (`Times New Roman`, `Georgia`, etc.) are BANNED in all screens.

---

## 4. Component Stylings

### 4.1 Buttons & Action Chips
*   **Default Button:** Large pill-shaped or rounded-lg (`--radius-lg: 0.75rem`). Minimum height `44px` for touch targets.
*   **Primary Active Action:** Neon background with primary background color as text (e.g. background `--neon-cyan`, color `--bg-primary`). Subtle glow (`box-shadow: 0 0 15px rgba(0, 245, 255, 0.3)`).
*   **Feedback/Active State:** Physical press effect. On hover, translate `-2px` upwards; on click/active, scale down (`scale(0.98)` or translate `0`).
*   **Word Chips (Clickable Tiles):** Rounded-md (`--radius-md: 0.5rem`), background `--bg-secondary`, border `1px solid var(--border-secondary)`. On click/select, transition to border `--neon-cyan` and glow.

### 4.2 Cards & Glass Containers
*   **Base Cards:** Background `--bg-card`, border `1px solid var(--border-primary)`. Generous inner padding (`--space-6: 1.5rem`).
*   **Glass Containers (`.glass`):** Background `rgba(31, 31, 37, 0.6)`, backdrop-filter `blur(12px)`.
*   **No Heavy Drop Shadows:** Use clean, thin 1px borders of `--border-primary` instead of heavy dark shadows.

### 4.3 Input Fields
*   **Default Input:** Background `--bg-secondary`, border `1px solid var(--border-secondary)`.
*   **Focus State:** Border changes to `--neon-cyan`, with a glow outline `box-shadow: 0 0 0 3px rgba(0, 229, 255, 0.15)`. No floating labels; labels are positioned strictly above inputs.

### 4.4 Loaders & Empty States
*   **Loaders:** Skeleton blocks with a pulsing cyber-shimmer effect. Do not use rotating loading wheels.
*   **Empty State:** Isolated illustrations or clean layouts detailing user action paths (e.g. "No vocabulary saved yet. Start reading a story to add new words.").

---

## 5. Layout & Grid Principles

*   **Responsive Collapsing:** Grid layouts must collapse to a single column under `768px`.
*   **Containment:** Content blocks must be wrapped in `.container` with a maximum width of `1280px` (`--max-content-width`).
*   **Asymmetric Split:** Avoid standard 3 equal cards. Favor asymmetric columns (e.g. 60% reader text / 40% side controls, or 70% dashboard chart / 30% stats panel).
*   **Reader Section Constraint:** To prevent reading fatigue, the maximum paragraph width inside `ChapterReader` must be capped at `750px` with a line-height of `1.85`.

---

## 6. Motion & Animation Rules

All transitions must feel lightweight and fast.

*   **Waterfall Mount:** Lists, cards, and vocabulary rows must mount with a staggered fade-in + slide-up effect (`@keyframes slideUp`).
*   **Transitions:** Standard transitions must use cubic-bezier easing (`var(--transition-normal): 250ms cubic-bezier(0.4, 0, 0.2, 1)`).
*   **Perpetual Motion:** Subtitle alerts or important notifications can have a subtle loop bounce or floating state (`animation: floating 4s ease-in-out infinite`).

---

## 7. Forbidden Patterns (Banned)

*   **No Emojis:** Use clean icons (e.g. Material Symbols Outlined) instead of colored emojis.
*   **No Pure Black:** Never use `#000000`. The absolute darkest background allowed is `#131318` (`--bg-primary`).
*   **No Generic Placeholders:** Never use fake placeholder names or arbitrary mock counts. All placeholders must read realistically (e.g. "Arthur Conan Doyle" instead of "Author Name", "Chapter 1: A Scandal in Bohemia" instead of "Chapter Title").
*   **No Overlapping Elements:** Keep layout elements strictly separated in space; no absolute overlapping containers that obstruct readable content.
*   **No Tailwind CSS Utility Slop:** All styles must be structured in semantic CSS classes mapped to the global variables.
