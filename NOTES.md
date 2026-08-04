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

## Robustness brainstorm backlog (2026-08-04)

**Shipped:** B5–B6, D13–17, E18–20, F21–23, B7, Sprint 2, and **A1–A4 + B8 + C9–C12** (full A/B/C).

### A — Edit ↔ output loop — done
1. Split live preview on Edit (xl+ desktop)
2. PDF preview iframe (Review → PDF)
3. Before-export checklist modal
4. ATS plain-text tab

### B — Quality tools — done
8. Deterministic JD keyword overlap (Job match panel)

### C — Versioning & safety — done
9. Version switcher + new version in header
10. Manual checkpoints (snapshot store/restore/delete)
11. Offline/error banner + retry; base_updated_at conflict
12. Notes list panel (canvas fields kept for later)

**Still open from this backlog:** none.

**Constraints:** no AI, no billing; surgical Laravel/Inertia/React changes.