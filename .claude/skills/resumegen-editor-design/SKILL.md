---
name: resumegen-editor-design
description: Use when designing, mocking up, or implementing UI for the Resumegen resume builder/editor (including comps, redesigns, or new panels on that surface). Encodes concrete scope and style constraints validated by the user across multiple sessions.
---

# Resumegen editor design constraints

## Scope: core workflow only

- The builder is for editing, exporting, and sharing a resume. Do not invent or add AI features, billing/pricing, job search, admin tools, chat, or analytics — these are out of scope even as mockup ideas.
- Builder tabs are **Edit**, **Review**, and **Optimize**. Clicking Review swaps the data form for a preview of the resume in place. Optimize holds the deterministic JD-match panel (keyword overlap, no model) and the ATS plain-text block — there is no AI anywhere in the app (removed 2026-08-26; see CLAUDE.md's "AI" section). There is no separate Guide tab.

## Sharing stays secondary

- Sharing is a secondary action from the builder, not a first-class panel.
- Complex share management (links, permissions, revocation, etc.) belongs outside the editor entirely — never build a sharing-management panel inside the builder.

## Preview and layout

- The live resume preview must stay large and useful. On the Edit tab (desktop, `xl+`) it renders as a **sticky side-by-side column next to the form** (user decision 2026-08-27); the Review tab keeps the full-column preview. Never expand the preview to full page width on Edit.
- The score rail is a **horizontal strip above the form, collapsed by default** (score number + band bars always visible; checklist/keywords/job match/section nav in the expandable drawer) — not a vertical sidebar, and no gauge (user decision 2026-08-27).
- Sections load **expanded** by default (user decision 2026-08-27) — editing is immediately available; collapse is a per-section action (chevron or double-click header).
- Use desktop space productively: prioritize fast scanning, visible editing context, strong hierarchy, and readable typography. Controls should not feel cramped.

## Visual style

- Clean, credible, modern, professional. Mostly neutral colors with one restrained accent color.
- Sentence case, real SVG icons, subtle borders, varied spacing.
- Avoid: generic dashboard card grids, excessive rounded cards, gradients, glassmorphism, neon colors, emoji icons, oversized decorative elements, unnecessary animation.
