# UI redesign — remaining work

Saved for a later session after P0–P2 of the redesign ladder.

**As of:** 2026-08-10 · **Tip of series:** `0200a5f` (P2) / later commits may sit on top  
**Stack:** Laravel 13 + Inertia React + Tailwind v3 · tokens in `tailwind.config.js`

---

## Already done (do not re-do)

| Tier | Commit theme | What shipped |
|------|----------------|--------------|
| Design-system cleanup | `d53c7d7` | Score bands, button API, lean dashboard, Modal a11y |
| Wave 1 soft shell | `6110ac2` | Floating nav island, Shell, button physics |
| Wave 2 home/marketing | `bd13d28` | Dashboard bento, share stage, early Welcome |
| Wave 3 tools | `1931a14` | Review paper stage, Kanban shells |
| Edit-tab restraint | `cb12eb4` | Quieter section chrome |
| Workstation chrome | `dba0653` / `4c8b1f8` | Header under nav; removed Back to dashboard |
| **P0** trust | `f895011` | Legal pages, branded errors, BrandMark, skip-to-content |
| **P1** Welcome | `eef0f22` | Display type, timeline steps, product hero, soft CTAs |
| **P2** shell | `0200a5f` | Logout fix, Go to… sheet, gray→ink sweep, Kanban empty, list rhythm |

**Product constraints (locked for UI work):**
- Free forever — no paywall / upgrade CTAs
- Editor stays dense and professional — no glassmorphism / marketing theater in Workstation
- Prefer `brand` / `surface` / `ink` tokens; residual dark-mode `gray-*` is known debt

---

## P3 — Editor polish (next when resuming redesign)

Small, safe, finishes the redesign ladder.

- [ ] **`tabular-nums` on all scores**  
  Dial, version dots, version scores, Kanban chips, any other score/count UI.  
  Touch: `score-dial.tsx`, `Dashboard.tsx`, `section-panel.tsx`, `Kanban.tsx`, related.

- [ ] **Placeholder copy**  
  Drop stock “Jane Doe” / “Acme” from paste-resume modal and target-company placeholders.  
  Touch: `new-resume-modal.tsx`, `inspector-sections.tsx` (and any similar placeholders).

**Done when:** scores align in tables/lists; sample placeholders read natural, not AI-stock.

---

## Optional later (not blocking)

- [ ] **Dark mode token pass** — replace remaining `dark:gray-*` with a tinted ink/surface system  
- [ ] **Real command/search** — beyond nav destinations (needs product decision + backend if full-text)  
- [ ] **Live Workstation screenshot** in Welcome hero (swap or augment `/images/templates/classic.png` frame)  
- [ ] **Dusk:** `php artisan migrate --env=dusk.local` then re-run `WorkstationResponsiveTest` after schema drift  
- [ ] **Legal review** of Privacy/Terms drafts if production compliance is required (currently product-facing drafts only)

---

## Suggested resume order

1. P3 tabular-nums + placeholders (one small PR)  
2. Dark mode tokens if dark users complain  
3. Hero screenshot / real search only if product prioritizes them  

---

## Quick verify after any UI batch

```bash
npm run build   # or npm run dev
php artisan test --compact tests/Feature/LegalPagesTest.php tests/Feature/DashboardShareInfoTest.php tests/Feature/Auth/AuthenticationTest.php
```

Log out: user menu → Log out must `POST /logout` (fixed in P2 — do not reintroduce `overflow-hidden` on the nav island without retesting the dropdown).
