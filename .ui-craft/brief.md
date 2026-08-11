# Design Brief

## 1. Product purpose

Builds, scores, and exports ATS-friendly resumes (PDF/DOCX) for free, with deterministic keyword/section coaching instead of relying on AI to judge quality.

## 2. Primary user

A job seeker managing multiple resume versions for different target roles — editing during focused desktop sessions, checking or sharing from mobile between job-search tasks. Not a design professional; wants guidance (score, checklist) more than raw layout control.

## 3. Principles

1. **Never fabricate what it can't verify.** AI features refuse rather than invent facts (cover-letter draft 422s with no linked resume); a malformed contact field is held back from a save rather than guessed at or silently dropped.
2. **Editing leads, guidance follows.** The resume form is the task. Score, checklist, and keyword coaching are supporting content — they never block or precede the form, on any viewport.
3. **Deterministic first, AI second.** Score, keyword match, and ATS text are computed by rules a user could audit. AI is an opt-in rewrite tool offered at equal weight to "coach me" — never the sole source of feedback.
4. **No feature is gated.** The product is free and unlimited. Nothing in the UI implies a locked feature, upgrade nag, or paywall — ever.
5. **Sharing happens after editing, not during.** Share links are stable across edits and managed on their own page (`/shares`), not interleaved into the builder.

## 4. Success metric

A user who opens an existing resume edits at least one section and either downloads (PDF/DOCX) or shares it in the same session, with a resume-strength score higher than when they arrived.

## 5. Out of scope

- Does not gate any feature behind a paid plan
- Does not manage or display share-link analytics inside the builder (lives on `/shares`)
- Does not let AI invent resume content without user-supplied facts to ground it
- Does not support real-time multi-user collaboration on one resume
- Does not track application/interview outcomes inside the resume surface

## 6. Learned constraints

_(none yet)_
