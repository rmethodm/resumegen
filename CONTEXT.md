# Resumegen Context

## Current Task
Shipped two sub-projects (specs + plans in docs/superpowers): repricing reposition + AI lockdown. All tests green (569).

## Key Decisions
- Repricing: Free 2 resumes/1 letter, Starter 10/10, AI 25/150/500/1000; org creation/seats gated to Agency; master admin (+ rmethodm@outlook.com) now resolves to agency tier. Hard-enforce via creation gates only — no destructive resume-locking UI.
- AI lockdown: AiService moderation pre-check (flagged→422, no quota burn) + user_{id} attribution + max_tokens cap (config ai.max_completion_tokens=1000).
- ClientFake is FIFO/type-agnostic: any new AI test must prepend a clean-moderation fake.

## Next Steps
- Earlier unstaged work (StrengthScore/target-JD, AiPrompts, migration) still in working tree — review/commit separately.
- AI lockdown spec mentioned future API ai-suggest routes don't exist yet; render() on the exception covers them when added.
