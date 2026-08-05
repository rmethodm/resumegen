# <Project> — Notes & knowledge base

Topical, not chronological. This is what you don't want to re-explain or
re-derive. Timeless reference + the reasoning behind decisions.

---

## Design decisions (locked)

### Resumegen Apply = extension, not iframe (locked)
- What: Job-form assist is a Chrome/Edge MV3 extension calling Resumegen’s Sanctum API; never drive third-party apply pages via iframe.
- Why: Cross-origin iframes cannot fill forms; many career sites block framing entirely.
- Rejected: Embedding employer sites in the SPA; remote “send clicks over IP” into iframes.

### Extension auth = Sanctum PAT with ability `extension` (locked)
- What: Tokens named `Resumegen Apply` are minted on Profile (`POST /profile/extension-tokens`); plaintext shown once; API requires ability `extension`.
- Why: Revocable, no session cookie in the extension, same stack as existing Sanctum setup.
- Rejected: Session cookie sharing; unauthenticated local IP sockets; reusing dead activity/thread API.

### Fill profile is a dedicated DTO, not full ResumeDocument (locked)
- What: `App\Support\ResumeFillProfile` is the wire contract for the extension (contact, inserts, latest role, top experiences).
- Why: Editor document shape will keep growing; extension field labels must stay stable.
- Rejected: Dumping `ResumeDocument::toArray()` into the extension.

### Apply extension UI = side panel, empty-only fill (locked)
- What: MV3 side panel is primary UI; bulk fill only writes empty fields; insert chips require page focus; no auto-submit.
- Why: Matches product wireframes; reduces accidental overwrite and bot-like behavior.
- Rejected: Popup feed (old activity extension); iframe control of employer sites.
- Dead-end: Old `extension/popup` + extractors + `/api/activity` — removed 2026-08-05; do not restore.

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