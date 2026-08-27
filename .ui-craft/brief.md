# Design Brief

## 1. Product purpose

Builds, scores, and exports ATS-friendly resumes (PDF/DOCX) for free, with deterministic keyword/section coaching instead of relying on AI to judge quality.

## 2. Primary user

A job seeker managing multiple resume versions for different target roles — editing during focused desktop sessions, checking or sharing from mobile between job-search tasks. Not a design professional; wants guidance (score, checklist) more than raw layout control.

## 3. Principles

1. **Never fabricate what it can't verify.** A malformed contact field is held back from a save rather than guessed at or silently dropped; score and coaching claim only what the rules actually checked.
2. **Editing leads, guidance follows.** The resume form is the task. Score, checklist, and keyword coaching are supporting content — they never block or interrupt editing. *(Amended 2026-08-27: the collapsed score strip renders above the form by user decision — see the `resumegen-editor-design` skill; the old "never precede the form" wording no longer holds literally.)*
3. **Deterministic only.** Score, keyword match, and ATS text are computed by rules a user could audit. There is no AI in the product (removed 2026-08-26) — do not reintroduce model-backed feedback without an explicit product decision.
4. **No feature is gated.** The product is free and unlimited. Nothing in the UI implies a locked feature, upgrade nag, or paywall — ever.
5. **Sharing happens after editing, not during.** Share links are stable across edits and managed on their own page (`/shares`), not interleaved into the builder.

## 4. Success metric

A user who opens an existing resume edits at least one section and either downloads (PDF/DOCX) or shares it in the same session, with a resume-strength score higher than when they arrived.

## 5. Out of scope

- Does not gate any feature behind a paid plan
- Does not manage or display share-link analytics inside the builder (lives on `/shares`)
- Does not include AI features of any kind (removed 2026-08-26)
- Does not support real-time multi-user collaboration on one resume
- Does not track application/interview outcomes inside the resume surface

## 6. Learned constraints

- **2026-08-27 — Sections load expanded on the editor.** Editing must be immediately available on page load; collapse is a per-section user action, never the default. **Why:** principle 2 — the form is the primary task, and a collapsed-by-default list adds a click before any field is reachable.
- Editor layout decisions (score strip above the form collapsed by default, sticky side-by-side preview on desktop Edit) live in the `resumegen-editor-design` skill — the single home for that surface's validated constraints. Don't duplicate them here.
