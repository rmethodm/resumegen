# Claude Design import notes — Resumegen (2026-08)

> Advisory only. How design work from **Claude Design** (Anthropic Labs) can hand off into this codebase.
> Complements mockups under `docs/mockups/` and ui-craft-style briefs.
> Product: [Claude Design](https://claude.com/product/design) · Announcement: Anthropic Labs, 2026-04.

---

## Bottom line

| Question | Answer |
|---|---|
| **Native import of a live Claude Design project?** | **No** — no private API into claude.ai/design from this agent/tooling. |
| **Use exported artifacts?** | **Yes** — HTML best; also screenshots, PDF/PPTX, written specs. |
| **Best handoff for Resumegen?** | Export **standalone HTML** (+ optional PNGs of key states) → `docs/mockups/` → implement in React/Tailwind. |

---

## What Claude Design is (context)

Claude Design is Anthropic’s design/prototype product (research preview for paid Claude plans). You collaborate in chat + canvas to produce designs, interactive prototypes, slides, one-pagers, etc. Powered by vision models (e.g. Opus 4.7 at launch).

**Typical exports (public product positioning):**

- Standalone **HTML**
- **PDF**
- **PPTX**
- **Canva**
- Handoff path toward **Claude Code** (instructions/code), not a Figma-native file at launch

Direct editable Figma export is not part of the core launch set; third-party bridges (e.g. HTML → Figma agents) exist outside this repo.

---

## What Grok Build / this repo can consume

| You provide | What works here |
|---|---|
| **Standalone HTML** (Share → export) | **Best path.** Read layout/structure/CSS; reimplement in Resumegen’s React 19 + Tailwind v3 + Headless UI stack. Prefer file under `docs/mockups/` or absolute path in chat. |
| **Screenshots / PNGs** of the canvas | Visual implement-from-mock (same pattern as existing mockups). |
| **PDF / slides** | Text + structure; weaker for interactive UI chrome than HTML. |
| **Written design notes** (tokens, spacing, components, copy) | Spec → code like any design doc. |
| **“Ready to build” / Claude Code handoff text** | Treat as an implementation plan if pasted into chat or a repo file. |

There is **no** special Claude Design importer in Resumegen — same workflow as other mockups and specs.

---

## What does not work

- Logging into **claude.ai/design** and pulling a private project by URL.
- Opening a proprietary Claude Design project format that isn’t exported as HTML/PDF/image.
- Live two-way sync (edit in Claude Design → auto-update the app).

---

## Recommended handoff for Resumegen

1. In Claude Design: export **standalone HTML**.
2. Optionally capture **PNGs** of empty / filled / mobile states.
3. Store under e.g. `docs/mockups/claude-design/<feature>/`.
4. Name the target surface (e.g. Optimize tab, New resume modal, Welcome, share modal).
5. Implementation should **map to existing components** (workstation header, section panel, modals, Tailwind tokens) — do **not** paste the exported HTML wholesale into production pages.

### Fit with stack conventions

- Frontend: React 19, TypeScript, Tailwind v3, Headless UI, Inertia pages under `resources/js/Pages/`.
- Prefer surgical edits to existing surfaces over greenfield CSS islands from the export.
- If the export implies new product behavior (AI, billing, gates), treat as design only until product approval (see CLAUDE.md).

---

## Related docs

- `docs/mockups/` — existing visual mockups (e.g. workstation header options)
- `docs/ai-reintroduction-map.md` — AI placement (if Design mock includes AI UI)
- `docs/ai-provider-comparison-2026-08.md` — provider pick when AI UI is real

---

## Next steps (optional, not started)

1. Drop a Claude Design HTML export into `docs/mockups/claude-design/` for a concrete screen.
2. Specify target page/component and acceptance criteria.
3. Implement as a normal UI pass (ui-craft / existing conventions), not a raw HTML embed.
