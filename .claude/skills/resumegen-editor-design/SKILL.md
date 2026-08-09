---
name: resumegen-editor-design
description: Use when designing, mocking up, or implementing UI for the Resumegen resume builder/editor (including comps, redesigns, or new panels on that surface). Encodes concrete scope and style constraints validated by the user across multiple sessions.
---

# Resumegen editor design constraints

## Scope: core workflow only

- The builder is for editing, exporting, and sharing a resume. Do not invent or add AI features, billing/pricing, job search, admin tools, chat, or analytics — these are out of scope even as mockup ideas.
- Builder tabs are **Edit**, **Review**, and **Optimize**. Clicking Review swaps the data form for a preview of the resume in place. Optimize holds the JD-match panel and the two Tier-1 AI actions (bullet rewrite, summary generation, both edit-in-place, disabled by default via `AI_ENABLED`) — see CLAUDE.md's "AI" section. There is no separate Guide tab.

## Sharing stays secondary

- Sharing is a secondary action from the builder, not a first-class panel.
- Complex share management (links, permissions, revocation, etc.) belongs outside the editor entirely — never build a sharing-management panel inside the builder.

## Preview and layout

- The live resume preview must stay large and useful, but it renders **within the same column as the form** — never expand it to full width.
- Use desktop space productively: prioritize fast scanning, visible editing context, strong hierarchy, and readable typography. Controls should not feel cramped.

## Visual style

- Clean, credible, modern, professional. Mostly neutral colors with one restrained accent color.
- Sentence case, real SVG icons, subtle borders, varied spacing.
- Avoid: generic dashboard card grids, excessive rounded cards, gradients, glassmorphism, neon colors, emoji icons, oversized decorative elements, unnecessary animation.
