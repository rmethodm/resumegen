# <Project> — Notes & knowledge base

Topical, not chronological. This is what you don't want to re-explain or
re-derive. Timeless reference + the reasoning behind decisions.

---

## Design decisions (locked)

### <Decision name> (locked)
- What: <the decision>
- Why: <the reasoning — this is the part that stops re-litigation>
- Rejected: <what you considered and didn't do, and why>

---

## Intentional, not bugs
Things that look wrong but are correct. Do not "fix" these.
- <behavior> — <why it's intended>

## Known permanent limitations
- <limitation> — <why it can't/won't be solved, so nobody re-chases it>

---

## Dead-ends (do not re-explore)
- Tried <X> → got <Y> → rolled back because <reason>.
- Did NOT <tempting shortcut> because <reason it's wrong>.

---

## Reference
API quirks, schemas, formulas, the regex you fought with, constants —
whatever a session might need to look up. Organize by topic/feature.

### <Topic>
<content>

---

## Robustness brainstorm backlog (deferred 2026-08-04)

Saved for later — do not auto-start. Pick a cluster or item numbers when resuming.

**Shipped this stretch:** B5–B6 (quality MVP), D13–17 (authoring), E18–20 (share; E20 = light branding only), F21–23 (PDF fonts, template thumbs, page hints).

**Still open (12 items):**

### A — Edit ↔ output loop
1. Split / sticky live preview while editing (desktop), not only Review
2. PDF-faithful preview (server preview iframe)
3. Before-export checklist (missing contact, empty bullets, density, 1-page estimate)
4. Plain-text / ATS paste view

### B — Quality tools (leftovers)
7. Live re-score on draft while editing
8. Deterministic JD keyword overlap (paste JD → missing terms; no AI)

### C — Versioning & safety
9. Named versions + restore from workstation (not only dashboard)
10. Manual snapshot / restore (`ResumeSnapshot` checkpoints)
11. Conflict / offline awareness (stale tab, failed-autosave banner + retry)
12. Wire notes UI (model exists; no canvas UI)

**Suggested order when resuming:** A1+A3 → C11+C9 → B8 → B7

**Constraints (still apply):** no AI, no billing; surgical Laravel/Inertia/React changes.