# App-wide layout-four shell + ⌘K command palette

Date: 2026-07-14
Status: Approved (design)

## Goal

Replace the app's top-bar-only chrome with TailAdmin's "layout-four" documentation shell — a
collapsible left sidebar plus a sticky top header — and add a working ⌘K command palette that
searches the user's resumes (including their content), cover letters, and nav destinations.

Reference: `https://react-demo.tailadmin.com/layout-four` (persistent left sidebar with grouped
nav + in-sidebar search; top header with hamburger, command-palette search, theme toggle, CTA).

## Scope

In scope: the chrome rebuild, the ⌘K palette, and a testable search backend over resume content.
Out of scope: nav information-architecture beyond the two groups below; native Postgres full-text
search; moving the test suite off SQLite.

## Decisions (locked during brainstorming)

- **Palette is a real feature**, not decorative chrome.
- **Search covers resume content**, implemented via a denormalized `search_text` column queried
  with case-insensitive `LIKE` — works identically on Postgres (prod) and SQLite (tests), so the
  feature is fully testable. Native Postgres FTS was rejected because it cannot run under SQLite
  and would force either skipped tests (Rule 12) or a separate test-infra migration.
- **Builder keeps two sidebars**: global nav moves nowhere on most pages, but on builder routes it
  auto-collapses to an icon rail; the builder's own panel moves from the left to the right edge.
- **Nav stays flat** (no nested/multi-level menus), organized into two labelled groups.

## Section 1 — The shell (`resources/js/Layouts/AuthenticatedLayout.tsx`, rebuild)

Two regions replacing the current single top bar.

**Left sidebar** — fixed, ~256px expanded, collapsible to a ~56px icon rail. Collapse state
persisted in `localStorage`. Contents:

- Brand block at top (existing gradient mark + "Resumegen" wordmark, links to dashboard).
- **Group "Workspace"**: Dashboard, Resumes, Cover Letters, Messages, and Admin (admin-only,
  same guarded `route()` fallback as today).
- **Group "Account"**: Profile, Portfolio.
- Each item is an icon + label vertical row; active state via `route().current(...)` exactly as
  the current `NavLink` logic. In the collapsed icon rail, labels are hidden and the icon shows a
  tooltip.

**Top header** — sticky. Left to right:

- Hamburger button — toggles the sidebar between expanded and icon rail.
- ⌘K search trigger — a *button* styled like a search field (placeholder "Search or type
  command…" + a ⌘K hint chip). Opens the palette. It is NOT a text input.
- Dark-mode toggle (existing `useDarkMode`).
- User dropdown — shrinks to **Log Out** only (Profile/Portfolio now live in the sidebar).

**Preserved unchanged**: impersonation banner, dark-mode support and colors, gradient brand mark.

**Mobile**: the sidebar becomes an off-canvas drawer opened by the hamburger; reuse the existing
`showingNav` responsive-menu state and `ResponsiveNavLink` items (now including Profile/Portfolio).

## Section 2 — Command palette (`resources/js/Components/CommandPalette.tsx`, new)

- Built on the existing `Modal` component.
- Opened by the header search button and by a global `keydown` listener for ⌘K (Meta+K) /
  Ctrl+K. `preventDefault` on the shortcut. Esc closes.
- One text input. On type, debounced ~150ms, calls the search endpoint; renders grouped results:
  - **Resumes** — matched by title/content, each links to `builder.edit`.
  - **Cover Letters** — matched by title/company, each links to `cover-letters.edit`.
  - **Go to** — static nav destinations filtered client-side (no round-trip).
- Keyboard: Up/Down move a highlighted index across the flattened result list; Enter
  `router.visit()`s the highlighted item.
- Empty state (no query yet): show the **Go to** nav destinations only.

## Section 3 — Search backend

**Migration** (`add_search_text_to_resumes_table`):
- Add nullable `search_text` TEXT column to `resumes`.
- Backfill existing rows by flattening their JSON (see below) in the migration's `up()`.

**Populate on save** — in `ResumeBuilderController`'s update path, build `search_text` from the
resume's own fields:
```php
$resume->search_text = collect([
    $resume->title,
    $resume->summary,
    ...Arr::flatten($resume->experience ?? []),
    ...Arr::flatten($resume->education ?? []),
    ...Arr::flatten($resume->skills ?? []),
])->filter()->implode(' ');
```
(Exact source columns to be confirmed against the model during implementation; principle is
"flatten the human-readable JSON content into one lowercase-searchable string".)

**Endpoint** — `GET /search?q=` (name `search`), under the existing `auth`/`verified` group.
Returns:
```json
{ "resumes": [{ "id", "title", "url" }], "coverLetters": [{ "id", "title", "url" }] }
```
- Both scoped to `auth()->id()`.
- `whereRaw('LOWER(search_text) LIKE ?', ['%'.strtolower($q).'%'])` for resumes; cover letters
  match on their existing title/company columns the same way.
- `limit(5)` each. Empty/whitespace `q` returns empty arrays.

Cover letters already store `title`/`company` as plain columns — no flattening needed there.

## Section 4 — Builder two-sidebar arrangement (`resources/js/Pages/ResumeBuilder/Edit.tsx`)

- The builder's own `<aside>` (currently first child of the `flex items-start` row, `border-r`)
  moves to be the **last** child with `border-l` — i.e. to the right edge. Purely a position
  change; none of its panel logic (template, AI, checklist, ATS) changes.
- The global left sidebar renders in its **icon-rail** state by default on builder routes
  (`route().current('builder.*')`), preserving editor width. Result: nav on the left rail,
  document tools on the right, editor in the middle.

## Testing (Rule 9)

- **Feature test — search endpoint**: results scoped to the authenticated user (another user's
  resume never appears); a query matching content inside a resume returns it; the 5-item limit
  holds; empty query returns empty arrays.
- **Feature test — `search_text` populates on save**: saving a resume writes a `search_text` that
  contains its summary/experience content.
- Shell and palette are presentation; no new backend tests. (Any React component test would only
  assert wiring already covered by the endpoint tests.)

## Risks / notes

- Flat 7-item nav across two groups is deliberately simple; the doc-shell sidebar is designed for
  deeper nav, so it will read as sparse. Accepted trade-off.
- `search_text` duplicates content already in the JSON columns; it is derived state, rebuilt on
  every save, so it can drift only if a write path bypasses the update method — the backfill
  migration plus save-path population are the only writers.
