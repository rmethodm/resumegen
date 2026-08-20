# Best Practices Scan — 2026-08-20

Codebase scan via `/laravel-best-practices`. Result: **no errors present.**

## Checks Run

| Check | Result |
| --- | --- |
| Test suite (`composer run test`) | 471 passed (1,823 assertions), 4.97s |
| Pint (`./vendor/bin/pint --test`) | Passed, zero style violations |
| TypeScript + Vite production build (`npm run build`) | Clean, built in 549ms |
| `composer audit` | No security vulnerability advisories |
| `npm audit` | 0 vulnerabilities |
| Last logged backend error | `testing.ERROR ... 500: down` — from a test simulating a job-board outage. Expected, not a real bug. |

## Upgrade Options (all optional, none urgent)

### Safe patch/minor bumps (low risk)

**Composer:**
- `barryvdh/laravel-debugbar` 4.4.1 → 4.4.2
- `mockery/mockery` 1.6.14 → 1.6.15

**npm:**
- `@inertiajs/react` 3.6.1 → 3.7.0
- `vite` 8.2.0 → 8.2.2
- `laravel-vite-plugin` 3.1.0 → 3.2.0
- `@vitejs/plugin-react` 6.0.3 → 6.1.0
- `postcss` 8.5.25 → 8.5.26
- `autoprefixer` 10.5.0 → 10.5.4
- `vitest` 4.1.10 → 4.1.11
- `web-vitals` 6.0.1 → 6.1.1

### Major bumps — recommend skip for now (breaking-change territory, zero current pain)

- `tailwindcss` 3.4 → 4.x — big config rewrite (CSS-first config), touches every style file. CLAUDE.md pins Tailwind v3. Not worth it unless v4 features are wanted.
- `guzzlehttp/guzzle` 7 → 8
- `phpunit/phpunit` 12 → 13
- `typescript` 5.9 → 7
- `concurrently` 9 → 10
- `pragmarx/google2fa-qrcode` 3 → 4
- `openai-php/laravel` 0.19 → 0.20 — check changelog before bumping; the AI stack depends on it.

## Enhancement Candidates (not done — need explicit go-ahead)

1. **`JobUrlImporter` DNS-rebinding gap** — known ceiling already documented in CLAUDE.md; fix is pinning the resolved IP via curl `CURLOPT_RESOLVE` (or an egress-allowlisting proxy). Only real security enhancement on the table.
2. **Static analysis** — no PHPStan/Larastan in the repo. Test suite is strong (471 tests), so marginal value; add only if type-level checks are wanted.

## Status

No fixes applied. Safe minor bumps offered (`composer update` + `npm update`, then re-run tests) — awaiting go-ahead.
