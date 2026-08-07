# Design Brief

## 1. Product purpose

Builds and exports ATS-friendly resumes with a live scoring/keyword coach, free and unlimited.

## 2. Primary user

An active job seeker, self-serve, tailoring one resume per target role on a laptop, in short repeat sessions over days or weeks.

## 3. Principles

1. "No AI, no black box." — Scoring, keyword matching, and JD overlap stay deterministic server-side code, not an LLM. The one narrow exception (bullet/summary rewrite) is opt-in and edit-in-place, never silent.
2. "Score every edit, explain every point." — The live gauge and checklist never hide why a number moved; every point has a named, checkable reason.
3. "Never lose the user's work — save without asking." — Debounced autosave everywhere, undo/redo, version snapshots. No explicit "Save" button to remember to press.
4. "Free means free — nothing here is gated behind a plan." — No paywall, no upsell CTA, no feature held back for a tier that doesn't exist.
5. "Privacy is the owner's choice, not the default." — Share links are opt-in per resume, with owner-controlled password/email/expiry gates — nothing is public by default.

## 4. Success metric for the surface

User's resume score crosses into the "good" band (checklist mostly complete) and they Download or Share within the same session.

## 5. Out of scope

- Does not generate a resume end-to-end via AI — rewrite/summary assist is opt-in and edit-in-place only
- Does not gate templates, exports, or share links behind a paid tier
- Does not surface a public job-board search inside the builder
- Does not publish a resume publicly by default — sharing is always an explicit, owner-initiated action

## 6. Learned constraints

(none yet)
