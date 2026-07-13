# Resumegen Context

## Current Task
AI direction resolved and shipped (2026-07-13). Bullet editor now offers "🎯 Coach me" and "✨ Write it for me" as equal 50/50 buttons. Coach (`critique_bullet`) asks what a weak bullet fails to say; the user answers in their own words and the bullet is rebuilt from their facts. AI re-enabled site-wide. Full suite green (532 passed), nothing committed yet.

## Key Decisions
- Option C at true 50/50 weight (user overrode the coach-primary recommendation).
- Career coach chat kept but **dark** behind its own flag (`ai_enabled:career_coach` middleware param, `AI_CAREER_COACH_ENABLED=false`); code intact, still tested via phpunit.xml.
- Translate / career map / resignation-letter generation **deleted outright**, not flagged off — highest cost, lowest value per AI_STRATEGY.md.

## Next Steps
1. **Production .env** needs `AI_ENABLED=true` + `AI_CAREER_COACH_ENABLED=false` — until then prod AI stays dark.
2. **Free tier AI quota is 0** (`config/ai.php`), so free users can't use the coach at all — pick a non-zero number or keep 0 deliberately.
3. **README.md + 9 template PNGs show modified** but were not touched by this work — review before staging.

Also open: wire cover letters to the existing `AiPrompts::coverLetter()` (no route yet); decide whether to hard-scope or delete career coach chat; add GitHub secrets `SSH_HOST`/`SSH_USER`/`SSH_PRIVATE_KEY` for the deploy pipeline; background-check vendor pick still with user.
