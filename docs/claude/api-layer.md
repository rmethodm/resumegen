### API layer (token-based, for the Chrome extension)
A JSON API lives under the `/api` prefix alongside the Inertia web layer. Auth uses Laravel Sanctum personal access tokens — **not** session cookies. Tokens are issued from the web app (`POST /profile/tokens` via `PersonalTokenController`, "Browser Extension" token), not via the API itself.

**Endpoints** (all require `Authorization: Bearer {token}` and `auth:sanctum`):
- `GET /api/activity`
- `POST /api/threads/{thread}/reply` — throttled 20/min

**Sanctum config:** `config/sanctum.php` sets `'guard' => []` (intentionally empty) to prevent web session fallback so only token-auth works for API requests.

**API tests:** All API test files must extend `Tests\Feature\Api\ApiTestCase` (not `Tests\TestCase`). `ApiTestCase` calls `$this->app['auth']->forgetGuards()` before each request to prevent Sanctum's guard cache from masking token revocation in multi-request tests.

**Note:** this API previously also served a mobile companion app (`/mobile`, Expo/React Native) with resume/cover-letter/resignation-letter CRUD, registration, and push-token endpoints. Mobile development was paused and that code removed (2026-07-08) — only the endpoints the Chrome extension depends on remain.
