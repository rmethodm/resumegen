### API layer (token-based, for iPhone app)
A JSON API lives under the `/api` prefix alongside the Inertia web layer. Auth uses Laravel Sanctum personal access tokens — **not** session cookies.

**Auth endpoints** (no `auth:sanctum` required):
- `POST /api/auth/register` — throttled 10/min
- `POST /api/auth/login` — returns `{ token }`, throttled 10/min
- `POST /api/auth/forgot-password` — throttled 5/min
- `GET /api/auth/me` — returns authenticated user (requires `auth:sanctum`)
- `POST /api/auth/logout` — revokes current token (requires `auth:sanctum`)

**Resume endpoints** (all require `Authorization: Bearer {token}`):
- `GET|POST /api/resumes` — index / store
- `GET|PUT|DELETE /api/resumes/{id}` — show / update / destroy
- `POST /api/resumes/{id}/duplicate`
- `GET /api/resumes/{id}/pdf`
- `POST|DELETE /api/resumes/{id}/photo`

**Cover letter endpoints** (all require `Authorization: Bearer {token}`):
- `GET|POST /api/cover-letters` — index / store
- `GET|PUT|DELETE /api/cover-letters/{id}` — show / update / destroy
- `POST /api/cover-letters/{id}/generate`

**Resignation letter endpoints** (all require `Authorization: Bearer {token}`):
- `GET|POST /api/resignation-letters` — index / store
- `GET|PUT|DELETE /api/resignation-letters/{id}` — show / update / destroy
- `POST /api/resignation-letters/{id}/generate`

**Other endpoints** (all require `Authorization: Bearer {token}`):
- `GET /api/activity`
- `POST /api/threads/{thread}/reply` — throttled 20/min
- `POST|DELETE /api/push-tokens`

**Sanctum config:** `config/sanctum.php` sets `'guard' => []` (intentionally empty) to prevent web session fallback so only token-auth works for API requests.

**API tests:** All API test files must extend `Tests\Feature\Api\ApiTestCase` (not `Tests\TestCase`). `ApiTestCase` calls `$this->app['auth']->forgetGuards()` before each request to prevent Sanctum's guard cache from masking token revocation in multi-request tests.
