# <Project> — Notes & knowledge base

Topical, not chronological. This is what you don't want to re-explain or
re-derive. Timeless reference + the reasoning behind decisions.

---

## Design decisions (locked)

### 2026-08-11 application surfaces
- Application tracking remains on `/job-applications`; the redesign adds an operator summary above the existing Kanban board without changing its Inertia CRUD or drag/drop routes.
- The workstation keeps Edit, Review, and Optimize as the core workflow; the pass widens the frame and adds breathing room without moving guidance ahead of editing.
- The public landing page uses the real template preview already in `public/images/templates/` and avoids invented score/search UI in the product preview.

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

### Apply field matching = scored heuristics (locked for v2.1)
- What: `extension/content/fill-heuristics.js` scores autocomplete + name/id/label + Workday `data-automation-id` + Ashby `_systemfield_*`; `fill.js` walks shadow DOM and same-origin iframes. Tests: `node --test extension/test/heuristics.test.cjs`.
- Why: ATS naming is inconsistent; first-regex-wins collides first/last/full name.
- Rejected: Dumping whole ResumeDocument; AI classification on every field (cost/latency).

---

## Intentional, not bugs
- Extension default app URL is `https://resumegen.test` — local Herd; production users set URL in Settings.
- CORS `allowed_origins` stays empty — extension background fetch uses host_permissions, not browser CORS.
- Fill never touches salary, EEO, passwords, checkboxes, or file inputs.

## Known permanent limitations
- Multi-step Workday/custom widgets (non-native inputs) may need site-specific work.
- Cross-origin iframes cannot be filled or scanned.
- Job-radar (scroll match alerts) is optional future product — not part of Apply fill MVP.

---

## Dead-ends (do not re-explore)
- Iframe-driving employer apply pages → blocked by SOP / X-Frame-Options.
- Old activity/thread extension API and popup → features removed; do not restore without product decision.

---

## Reference

### Resumegen Apply API
- Token: Profile → Generate connection token (`Resumegen Apply`, ability `extension`)
- `GET /api/extension/me`
- `GET /api/extension/resumes`
- `GET /api/extension/resumes/{id}/fill-profile`
- Load extension: `extension/README.md` (unpacked folder)
- Docs: `docs/claude/api-layer.md`

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
