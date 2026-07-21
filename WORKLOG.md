# WORKLOG

Queue of questions and tasks for Claude. One item per pass.

**The queue is empty as of 2026-07-21** — everything below is closed. What remains is kept for the
reasoning, not as work.

**How to use:** say "Process the next TODO in WORKLOG.md". Claude fills in `### Answer`
and flips the status. Don't ask for all items in one go — that reproduces the long-chat
problem this file exists to avoid.

**Status:** `TODO` | `DONE` | `BLOCKED` (blocked = waiting on something outside this repo).
**Type:** `research` (read-only, cheap) | `code` (changes files, needs tests). Don't mix in one pass.

Move `DONE` items to `WORKLOG-archive.md` when this file gets long — every read costs context.

**If an item turns out to be bigger than one pass, split it into sub-items instead of powering
through.** A half-finished item with a confident-sounding answer is worse than three honest ones.

**Record the answer even when the answer is "don't do this", and say why.** Undocumented rejections
get re-litigated — subscriptions were rejected twice before the reasons got written down.

Project rules live in `CLAUDE.md`. Do not restate them here.

---

## Closed 2026-07-21 — the pricing investigation was abandoned

Q1, Q2, Q3, Q9 and Q10 all asked about grant size, price elasticity or competitor free tiers.
Q6 asked how to split a branch whose largest workstreams were pricing instrumentation and job
search. On 2026-07-21 AI, the prepaid billing instrumentation and Job Search were removed from
the codebase, along with both pricing docs and the growth model. Every one of those items is
moot — not blocked, not deferred. Nothing about them needs doing. If pricing is ever revisited
it starts from scratch, with production data, not from these questions.

The items themselves are in git history if the reasoning is ever wanted.

---

## Q4 — JdMatcher fallback has never run in a browser
status: DONE · type: code · files: resources/js/Pages/ResumeBuilder/Partials/JdMatcher.tsx, .env.dusk.local

> **Superseded 2026-07-21:** `JdMatcher`, `AtsMatchPanel` and `AI_ENABLED` are all deleted.
> Kept for the standing lesson: this repo has a JS test runner (`npm run test:js`, vitest) because
> of this item, and pure helpers in `resources/js` are testable without Dusk.

`JdMatcher` renders only when `aiEnabled` is false, but both `.env` and `.env.dusk.local`
set `AI_ENABLED=true`. Covering it needs a Dusk server booted with AI off (`config()->set`
in the test will not work — Dusk drives a separate server process).

### Answer
**Needs a decision — do not proceed without picking an option below.**

Confirmed the premise. `Edit.tsx:1366-1376` is the only render site; `AtsMatchPanel` when
`aiEnabled`, `JdMatcher` otherwise. `AI_ENABLED=true` in `.env`, `.env.example` **and**
`.env.dusk.local`, and prod is meant to be true as well — so `JdMatcher` renders in no
environment that currently exists. It is degradation cover for an AI suspension, which is
consistent with `EnsureAiEnabled` 404ing AI routes so a suspended feature looks absent.

Two things found along the way that change the cost of each option:

- **There is no JavaScript test runner in this project.** No vitest, no jest in `package.json`.
  Any plan to test React directly means adding a devDependency, which needs your approval.
- **`tests/Browser/` has exactly one file** (`ResumeBuilderTest.php`, 96 lines), so there is no
  existing multi-env Dusk pattern to copy.

Options, cheapest first:

1. **Do nothing, document it.** `JdMatcher` is pure and presentational; the realistic failure is
   `buildPlainText` throwing on an unexpected resume shape. Accept that it surfaces during an AI
   outage rather than before one. Cost: zero. Risk: the fallback's first-ever execution happens
   in front of users on the worst day.
2. **Add vitest, export `matchJd`/`tokenize`, unit-test the logic and `buildPlainText`.**
   Vite 8 is already installed so config is ~10 lines. Covers the code most likely to break and
   gives the repo its first JS test. Does **not** prove the component mounts. Cost: one
   devDependency (needs approval).
3. **Second Dusk env with AI off.** `.env.dusk.ai-off` + a server on port 8002 + a test group +
   a CI change + a `CLAUDE.md` note. Proves the whole path end to end. Cost: real, and it doubles
   the Dusk setup burden documented in `CLAUDE.md` for one component.

**Recommendation: (2).** It buys the coverage that matters — the pure logic shared with `Q5`'s
`buildPlainText` — at a fraction of (3)'s cost, and it unblocks testing every other pure helper in
`resources/js`. (3) is only worth it if AI suspension is a scenario you actually expect to hit.

**Resolved 2026-07-20: you picked (2).** Added `vitest` as a devDependency, exported `tokenize`
and `matchJd`, added `npm run test:js`, and wrote `JdMatcher.test.ts` — 8 tests, all passing,
`tsc --noEmit` clean. The tests assert *why* the logic matters (tech punctuation must survive
tokenizing or the panel reports gaps that are not gaps; stopwords must be dropped or every score
inflates toward 100%; an all-stopword JD must score 0 rather than `NaN`, because the score is
written straight into a CSS width).

**Still not covered, deliberately:** nothing proves the component *mounts*. That needs option (3),
a Dusk server booted with AI off. The pure logic was the part that could silently rot; a mount
failure is loud and immediate whenever AI is next suspended.

**Bug found, not fixed** (surgical-changes rule — it is outside this item): `tokenize` drops a
leading dot, so `.NET` becomes `net`. A JD requiring `.NET` will match a resume that merely says
"net". The test documents current behaviour rather than the desired behaviour. Filed as Q8.

**Side finding, unrelated to this item:** the dual-graph stored decision claims `JdMatcher` was
"wired as `'jd-match'` LAB_VIEW" with a `LAB_VIEWS` registry in `Edit.tsx`. There is no `LAB_VIEWS`
symbol in `Edit.tsx` on this branch — that decision is stale or was reverted. Filed as Q7.

---

## Q5 — PlainTextView's component export is dead
status: DONE · type: code · files: resources/js/Pages/ResumeBuilder/Partials/plainText.ts

> **Superseded 2026-07-21:** `plainText.ts` was deleted with the AI removal.

Only `buildPlainText` and the type are used (by `JdMatcher`). Decide: wire the component
into a LAB_VIEW, or delete it and keep the helper.

### Answer
**Deleted the component, kept the helper.** Git history settles it — this was not an oversight:

- `8ad5bf7` (17 Jul, 10:57) added the `LAB_VIEWS` preview chooser with `PlainTextView` + `JdMatcher`.
- `4666d6b` (17 Jul, 12:01 — **one hour later**) replaced that whole design with the collapsible
  4-tab right panel (Preview / Design / Optimize / Share), explicitly "reversing the earlier
  slimming". `JdMatcher` was re-homed into the Optimize tab as the AI-off fallback. `PlainTextView`
  was dropped, and its import narrowed from default+type to type-only **in that same commit**.

The plain-text dump has no home in the tab design, and re-wiring it would mean inventing a place
for it. Deleting is the smaller change and matches the decision already made an hour after it
was written.

Also renamed `PlainTextView.tsx` → `plainText.ts` (via `git mv`, so history follows). A `.tsx`
named after a view that contains no view is exactly what made this item necessary. Dropped the
now-unused `useMemo`/`useState` import and the orphan `type Props = ResumeContent` alias; updated
the three import sites (`Edit.tsx`, `JdMatcher.tsx`, `JdMatcher.test.ts`).

Verified: `npx tsc --noEmit` clean, `npx vitest run` 8/8 passing.

---

## Q7 — Stale `LAB_VIEWS` decision in the dual-graph store
status: DONE · type: research · files: resources/js/Pages/ResumeBuilder/Edit.tsx

The graph's stored decisions claim `Edit.tsx` has a `LAB_VIEWS` registry with `'plaintext'` and
`'jd-match'` entries and a sidebar "Preview" chooser. No `LAB_VIEWS` symbol exists in `Edit.tsx`
on this branch. Either it was reverted or it lives on another branch. Decide whether to restore
it or purge the decision — it is currently misleading every session's startup context.

Related: the graph itself is stale, built for `/Users/rmethod/Herd/resumegen` (lowercase) while
the project resolves as `/Users/rmethod/Herd/Resumegen`. Needs `graph_scan` to rebuild.

### Answer
**Answered while doing Q5 — the decision is stale, not wrong.** `LAB_VIEWS` was real, added in
`8ad5bf7` and removed an hour later by `4666d6b` when the 4-tab right panel replaced it. The graph
recorded the first decision and never saw the reversal.

**Rescan done** — 1497 files, 1816 symbols, 11279 edges. `graph_continue` now returns
`confidence: high` against `/Users/rmethod/Herd/Resumegen` instead of refusing every query and
silently falling back to grep. The path-casing problem is fixed.

**The rescan did NOT clear the stale decisions — I predicted wrongly that it would.**
`graph_scan` rebuilds `info_graph.json` and `symbol_index.json` only. Decisions live in
`.dual-graph/context-store.json`, which the scan never touches (its mtime was unchanged), and
both `LAB_VIEW` entries survived.

Appended two corrections via `graph_add_memory` (the store is append-only, and `CLAUDE.md`
forbids editing `context-store.json` directly). Retrieval ranks on recency — the `why` field
shows a recency term — so the corrections should outrank the stale entries. **Not verified:**
whether the SessionStart hook's "Decisions" block shows the correction above the stale pair.
Check the next session's startup output; if the stale entries still lead, the only remaining
fix is editing `context-store.json` by hand, which contradicts the project rule.

**Standing lesson:** `graph_scan` refreshes code structure, not recorded decisions. Stale
decisions must be corrected explicitly. Treat stored decisions as leads to verify against the
code, never as fact.

**Lesson worth noting:** the graph's stored decisions record what was decided, not what survived.
Treat them as leads to verify against the code, never as fact — the same rule already applied to
memory files.

---

## Q8 — `tokenize` drops a leading dot, so `.NET` matches "net"
status: DONE · type: code · files: resources/js/Pages/ResumeBuilder/Partials/JdMatcher.tsx

> **Superseded 2026-07-21:** `JdMatcher` and its tests were deleted. The trap is worth remembering
> if keyword matching is ever rebuilt: a token regex that requires a leading alphanumeric silently
> turns `.NET` into `net`.

Found while writing Q4's tests. The regex `[a-z0-9][a-z0-9+#./-]*` requires an alphanumeric first
character, so `.NET` tokenizes to `net`. A JD requiring `.NET` scores as covered against a resume
that only contains the word "net". `C++` and `node.js` survive correctly; only a **leading**
separator is lost.

`JdMatcher.test.ts` currently asserts the buggy output (`'.NET'` → `'net'`) so the suite documents
reality. Fixing the regex means updating that assertion in the same change.

Low priority — this panel renders in no live environment (see Q4).

### Answer
**Fixed.** One character of regex: `/[a-z0-9][a-z0-9+#./-]*/g` → `/\.?[a-z0-9][a-z0-9+#./-]*/g`.
A dot is the only leading separator worth allowing — no real skill starts with `+`, `#`, `/`
or `-`, so a broader character class would only invent tokens.

Verified old vs new on the same inputs before trusting the suite:

| Input | Old | New |
|---|---|---|
| `Node.js CI/CD C++ .NET` | `node.js, ci/cd, c++, net` | `node.js, ci/cd, c++, .net` |
| `.NET developer` | `net, developer` | `.net, developer` |
| `Kubernetes. Docker, Terraform-` | `kubernetes, docker, terraform` | **unchanged** |

The third row is the one that mattered — trailing-separator trimming is untouched, so the
sentence-position case Q4 covered does not regress.

Tests: updated the assertion that documented the bug, and added three that pin the behaviour
(`.NET` tokenizes with its dot; a resume saying "net revenue" does **not** cover a JD requiring
`.NET`; a resume that names `.NET` properly still matches). Confirmed all three fail against
the old regex — a test that passes either way would have been worthless here. `npx vitest run`
11/11, `npx tsc --noEmit` clean.

**Remaining limitation, not fixed and not a regression:** a resume saying `ASP.NET` tokenizes to
`asp.net`, which still does not match a JD's `.net`. Exact-token matching cannot see the
substring, and the panel already tells the user it does "exact word matches only, no synonyms or
stemming". Fixing it means real matching logic, which is a different item and probably not worth
it for a panel that renders in no live environment (Q4).

---
