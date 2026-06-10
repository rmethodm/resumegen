# Resumegen Context

## Current Task
Threads & messaging system built — replaced resume_questions with resume_threads + resume_thread_messages. CLAUDE.md updated.

## Key Decisions
- All AI removed: controllers, services, models, routes, React components, nav links, tests
- `create-tailored-copy` route kept — it's a manual resume copy (Master Resume feature), not AI
- Threads system: visitor starts thread via public view; owner replies via editor; Messages inbox at `/messages`

## Next Steps
- 5 deferred audit fixes still pending (see project-audit-remaining-fixes.md)
- Feature backlog candidates: real-time live score, kanban job tracker
