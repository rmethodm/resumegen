# WORKLOG

Queue of questions and tasks for Claude. One item per pass.

**How to use:** say "Process the next TODO in WORKLOG.md". Claude fills in `### Answer`
and flips the status. Don't ask for all items in one go — that reproduces the long-chat
problem this file exists to avoid.

**Status:** `TODO` | `DONE` | `BLOCKED` (blocked = waiting on something outside this repo).
**Type:** `research` (read-only, cheap) | `code` (changes files, needs tests). Don't mix in one pass.

Move `DONE` items to `WORKLOG-archive.md` when this file gets long — every read costs context.

**If an item turns out to be bigger than one pass, split it into sub-items instead of powering
through.** A half-finished item with a confident-sounding answer is worse than three honest ones.

**Record the answer even when the answer is "don't do this", and say why.** Undocumented rejections
get re-litigated — subscriptions were rejected twice before the reasons got written down.

Project rules live in `CLAUDE.md`. Do not restate them here.

---

## Q1 — Grant size vs free-tier competitiveness
status: BLOCKED · type: research · files: docs/prepaid-pricing-model.md §14

The 19-scenario sweep narrows the signup grant but cannot settle it. Blocked on real
usage data per §12's stop rule. Do not decide this from the fabricated seeder.

### Answer
_(pending — blocked)_

---

## Q2 — Price elasticity is unmodelled
status: BLOCKED · type: research · files: docs/growth-model-sample-run.md

Carries the largest swing in the tornado chart, and nothing in the model represents it.
Blocked on production conversion data.

### Answer
_(pending — blocked)_

---

## Q3 — Launch grant amount
status: BLOCKED · type: research · files: docs/prepaid-pricing-model.md §8

Floor is $8. Needs a production count of qualifying accounts, which does not exist yet.

### Answer
_(pending — blocked)_

---

## Q4 — JdMatcher fallback has never run in a browser
status: TODO · type: code · files: resources/js/Pages/ResumeBuilder/Partials/JdMatcher.tsx, .env.dusk.local

`JdMatcher` renders only when `aiEnabled` is false, but both `.env` and `.env.dusk.local`
set `AI_ENABLED=true`. Covering it needs a Dusk server booted with AI off (`config()->set`
in the test will not work — Dusk drives a separate server process).

### Answer
_(pending)_

---

## Q5 — PlainTextView's component export is dead
status: TODO · type: code · files: resources/js/Pages/ResumeBuilder/Partials/PlainTextView.tsx

Only `buildPlainText` and the type are used (by `JdMatcher`). Decide: wire the component
into a LAB_VIEW, or delete it and keep the helper.

### Answer
_(pending)_

---

## Q6 — Split this branch before main
status: TODO · type: code

36+ commits on `experiment/preview-left-skills-panel`. Builder is verified (Dusk 3/3,
React mounts clean, save-on-blur round trip works). Prod `.env` needs `AI_ENABLED=true`
and deploy secrets `SSH_HOST` / `SSH_USER` / `SSH_PRIVATE_KEY`.

### Answer
_(pending)_
