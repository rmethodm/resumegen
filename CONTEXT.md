# Resumegen Context

## Current Task
Batch 10 complete — spellcheck, two-column template, weekly trend chart, OG image polish. 524/524 tests passing.

## Key Decisions
- Browser-native spellCheck added via Field component prop (type === 'text' default); Location/Phone/LinkedIn/Website get explicit false
- Tips sidebar, portfolio page, funnel chart, and timeline template were pre-built — plan only covered gaps
- Weekly trend chart aggregates client-side from existing applications prop (created_at added to query)

## Next Steps
- Batch 11 candidates: more templates, GitHub portfolio import, application funnel enhancements
- 5 deferred audit fixes still pending (see project-audit-remaining-fixes.md)
