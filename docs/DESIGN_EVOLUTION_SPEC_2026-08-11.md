# Design evolution spec — CLAT Prep Studio

**Date:** 11 August 2026
**Basis:** `design-taste-frontend` (leonxlnx/taste-skill), applied as a **redesign — preserve**
**Mode:** targeted evolution, not overhaul (§11.E: IA, content and SEO are sound)
**Dials:** `DESIGN_VARIANCE 5 · MOTION_INTENSITY 3 · VISUAL_DENSITY 6`

> Design read: *a single-student study product for a 17-year-old sitting CLAT in 117 days,
> with an existing brand system in place, leaning toward typography-first evolution.*

The skill's baseline is `8 / 6 / 4`. We are deliberately below it on variance and motion:
this is a tool used for hours a day by one person who needs to find her session, not be
impressed. Density is above baseline because it is a dashboard, not a landing page.

---

## Scope boundary

The skill states: *"Landing pages, portfolios, and redesigns. Not dashboards, not data
tables, not multi-step product UI."*

Six of seven module surfaces are dashboards and are **out of scope** for its layout
prescriptions. Applied here are §9 (AI tells — universal), §4.7 (layout hard rules, where
they fit a product UI) and §11 (redesign protocol). The rest is deliberately not applied.

---

## C1 — Load the typefaces that are already declared

**Priority: 1 · Effort: half a day · Risk: low · Type: correctness + §9.B**

### Problem

`src/index.css` declares:

```css
--font-main: 'Inter', system-ui, -apple-system, sans-serif;
--font-mono: 'JetBrains Mono', monospace;
```

Neither font is ever loaded. Verified:

| Check | Result |
|---|---|
| `@font-face` rules in `src/` | 0 |
| Font files in `public/` | 0 |
| Font `<link>` or `@import` in `index.html` | 0 |

**Every user has always seen the fallback.** `system-ui` resolves to SF Pro on Apple,
Segoe UI on Windows, Roboto on Android. The hero headline carries
`letter-spacing: -.055em` — tuning that was calculated for a face that never rendered.

This is not only the §9.B "Inter as default" tell. It is a silent fallback: the product
looks materially different on her phone than on her laptop, and neither is the intended
design.

### Change

Self-host two families, subset to Latin, `woff2` only.

| Role | Family | Weights | Why |
|---|---|---|---|
| UI and body | **IBM Plex Sans** | 400, 500, 600, 700 | Drawn for dense information; has character where Inter is deliberately neutral; SIL OFL |
| Data, labels, code | **IBM Plex Mono** | 400, 600 | Designed as a matched pair — the tabular figures in scorecards and session tables line up without fighting the text face |

Not Inter (§9.B). Not a serif display — an exam product read for three hours a day should
not carry editorial flourish at body size.

**Files**

1. Add `public/fonts/` with 6 `woff2` files (~180 KB total, subset).
2. Add `@font-face` blocks to `src/index.css` with `font-display: swap`.
3. Update tokens:
   ```css
   --font-main: 'IBM Plex Sans', system-ui, sans-serif;
   --font-mono: 'IBM Plex Mono', ui-monospace, monospace;
   ```
4. Preload the two above-the-fold faces in `index.html`.
5. Re-tune `letter-spacing` on `.clat-module-hero h1`, `.ai-tutor-hero h1` and
   `.marketing-hero` headings against the real metrics. Plex is wider than Inter; the
   current `-.055em` will be too tight.

### Acceptance

- Network panel shows the `woff2` files loading; no layout shift after swap.
- Identical rendering on macOS, Windows and Android.
- `font-variant-numeric: tabular-nums` verified on the section scorecard and session ladder.
- Build size increase under 200 KB.

---

## C2 — Remove the "Aspirant" placeholder

**Priority: 2 · Effort: 1 hour · Risk: none · Type: §9.D (Jane Doe effect)**

### Problem

Six sites substitute a generic name when no profile exists:

| File | Line | Current |
|---|---|---|
| `src/App.jsx` | 370 | `'CLAT Aspirant'` |
| `src/components/CADashboard.jsx` | 52 | `'CLAT Aspirant'` |
| `src/components/GKDashboard.jsx` | 43 | `'CLAT Aspirant'` |
| `src/components/StudentDashboard.jsx` | 155 | `'CLAT Aspirant'` |
| `src/components/Dashboard.jsx` | 299 | `'Aspirant'` |
| `src/components/AITutor.jsx` | 66 | `'Aspirant'` |

The tutor hero currently reads **"Aspirant, train the constraint that is costing you
marks."** This app has one student. Addressing her as a category is worse than not
addressing her at all.

### Change

Add `src/utils/studentName.js`:

```js
/**
 * Her name, or nothing. A placeholder name is worse than no greeting: it tells
 * the learner the product does not know who she is.
 */
export function firstNameOf(currentUser, profile) {
  const full = currentUser?.displayName || profile?.name || '';
  return full.trim().split(/\s+/)[0] || null;
}
```

Each of the six call sites takes the null case and **drops the greeting**, rather than
filling it:

| Surface | With a name | Without |
|---|---|---|
| AI Tutor hero | `Drishti, train the constraint that is costing you marks.` | `Train the constraint that is costing you marks.` |
| GK / CA hero | `Welcome Drishti! Explore…` | `Explore the Current Affairs Knowledge Graph…` |
| Student dashboard | `Drishti's command centre` | `Your command centre` |
| Quant hero | `Let's find your highest-impact gap, Drishti.` | `Let's find your highest-impact gap.` |

`App.jsx:370` writes into the stored profile, so it must store `null`, not a placeholder —
otherwise the fake name persists to Firestore and every later read inherits it.

### Acceptance

- `grep -rn "Aspirant" src/` returns nothing outside `src/data/`.
- Signed out: no greeting anywhere, no empty `", "` artefacts.
- Signed in as Drishti: first name only, never the full name in a sentence.

---

## C3 — Em-dash policy

**Priority: 3 · Effort: 1 hour · Risk: none · Type: §9.G**

### Problem

Three distinct uses, which the skill's blanket ban does not separate. Counted:

| Kind | Count | Action |
|---|--:|---|
| Glued `word—word` in headlines and body | 7 | **Rewrite** |
| Spaced ` — ` in prose | 11 | **Rewrite** |
| `'—'` as an empty-state value | 15 | **Keep** |

The 15 placeholders are not prose. `'—'` in a scorecard means *no data yet*, and it is the
honest empty state we deliberately introduced to replace fabricated numbers. Removing them
would undo a correctness fix in service of a copy rule. **Explicitly out of scope.**

### Change — the 7 glued instances

| File | Line | From | To |
|---|---|---|---|
| `HomeDashboard.jsx` | 558 | `You leave with evidence—not study guilt.` | `You leave with evidence, not study guilt.` |
| `HomeDashboard.jsx` | 610 | `Progress should explain what remains—and what to do now.` | `Progress should explain what remains, and what to do now.` |
| `HomeDashboard.jsx` | 464 | (hero note) | rewrite to a full stop |
| `HomeDashboard.jsx` | 539 | (body copy) | rewrite to two sentences |
| `Dashboard.jsx` | 627 | `Mistakes become scheduled learning—not lost marks.` | `Mistakes become scheduled learning, not lost marks.` |
| `Dashboard.jsx` | 720 | `No separate silos or duplicate content—every tool reads…` | split into two sentences |
| `AITutor.jsx` | 138 | `mode—not a generic chapter test.` | `mode, not a generic chapter test.` |

The 11 spaced instances become full stops or commas as the sentence requires. Source-code
comments are not user-facing and are out of scope.

### Acceptance

- No `\w—\w` match anywhere in `src/**/*.jsx`.
- All 15 empty-state `'—'` values still present and rendering.

---

## C4 — Spacing rhythm across the shared shell

**Priority: 4 · Effort: half a day · Risk: low · Type: §11.D lever 2**

### Problem

All seven modules now share `StudioShell`, but not a vertical rhythm. Section padding was
authored per component and drifted: `.studio-workspace` uses 30px, `.daily-plan` 26px,
`.clat-module-hero` 32px, `.section-scorecard` 24px. Moving between modules, the content
edge shifts by up to 8px with no reason a reader could name.

### Change

Add a spacing scale to `src/index.css` and consume it everywhere:

```css
--space-2: 8px;   --space-3: 12px;  --space-4: 16px;
--space-5: 24px;  --space-6: 32px;  --space-7: 48px;
```

- `.studio-workspace` → `--space-6`
- All panel and card padding → `--space-5`
- Gap between stacked sections → `--space-6`
- Mobile (`< 820px`) drops one step

### Acceptance

- No hard-coded `px` padding on any section or card container in the four studio stylesheets.
- Content left edge identical across all seven modules at 1440px and 390px.

---

## Explicitly not doing

The skill flags these. Each is wrong for this product, and the reasoning is recorded so it
is not re-litigated.

| Rule | Why we decline |
|---|---|
| §9.F **No section-number eyebrows** — `SESSION 07` | The number is the primary navigation fact on a session card: which of 44. The rule targets decorative enumeration (`001 · Capabilities`); this is real information. |
| §9.C **No 3-column equal grids** — 8 instances | The ban exists because three identical feature cards are landing-page filler. Ours carry four live metrics. The skill excludes dashboards for exactly this reason. |
| §4.7 **Nav ≤ 80px** — ours is ≈112px | Two rows was the fix for thirteen controls wrapping and clipping on one row. Complying would reintroduce a real defect. |
| §1 **Baseline dials 8 / 6 / 4** | Raising variance and motion on a tool used three hours a day trades legibility for novelty. Set to 5 / 3 / 6 above, deliberately. |
| §2.A **Adopt an official design system** | The project already has a brand system (`--brand-*` tokens, brand bible). §11.C requires preserving it. |

---

## Sequence and effort

| # | Change | Effort | Depends on |
|---|---|--:|---|
| C2 | Remove "Aspirant" | 1 h | — |
| C3 | Em-dash rewrite | 1 h | — |
| C1 | Load real typefaces | 4 h | — |
| C4 | Spacing rhythm | 4 h | C1 (metrics change spacing) |

**Total ≈ 1.5 days.** C2 and C3 are independent and shippable immediately. C1 must land
before C4, because the new font metrics change what correct spacing looks like.

## Verification

Each change ships with:

- `npm run build` clean
- Full suite green (66 tests)
- A preview deployment
- Visual check at 1440px, 1024px, 390px, in both themes

No change in this spec alters scoring, progress, question content or the answer key. The
existing test suites are the regression net; no new tests are required except a lint-style
assertion for C2 (`grep` for the placeholder) and C3 (`\w—\w`).
