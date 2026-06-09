### API layer (token-based, for iPhone app)
A JSON API lives under the `/api` prefix alongside the Inertia web layer. Auth uses Laravel Sanctum personal access tokens — **not** session cookies.

**Auth endpoints** (no `auth:sanctum` required):
- `POST /api/auth/login` — returns `{ token }`, throttled 10/min
- `GET /api/auth/me` — returns authenticated user
- `POST /api/auth/logout` — revokes current token

**Resume endpoints** (all require `Authorization: Bearer {token}`):
- `GET|POST /api/resumes` — index / store
- `GET|PUT|DELETE /api/resumes/{id}` — show / update / destroy
- `POST /api/resumes/{id}/duplicate`
- `POST /api/resumes/{id}/ai-suggest` — throttled 10/min
- `GET /api/resumes/{id}/ats-score` — throttled 10/min

**Cover letter endpoints** (all require `Authorization: Bearer {token}`):
- `GET|POST /api/cover-letters` — index (no body field) / store (renders body from template)
- `GET|PUT|DELETE /api/cover-letters/{id}` — show (includes body) / update / destroy

**Job application endpoints** (all require `Authorization: Bearer {token}`):
- `GET|POST /api/jobs` — index (eager-loads `resume:id,name`) / store
- `GET|PUT|DELETE /api/jobs/{id}` — show / update / destroy

**Sanctum config:** `config/sanctum.php` sets `'guard' => []` (intentionally empty) to prevent web session fallback so only token-auth works for API requests.

**API tests:** All API test files must extend `Tests\Feature\Api\ApiTestCase` (not `Tests\TestCase`). `ApiTestCase` calls `$this->app['auth']->forgetGuards()` before each request to prevent Sanctum's guard cache from masking token revocation in multi-request tests.
