### API layer (token-based, for Resumegen Apply)

A JSON API lives under the `/api` prefix alongside the Inertia web layer. Auth uses Laravel Sanctum personal access tokens — **not** session cookies. Tokens are issued from the web app (`POST /profile/extension-tokens` via `ExtensionTokenController`, name `Resumegen Apply`, ability `extension`), not via the API itself. Plaintext is flashed once on create.

**Endpoints** (all require `Authorization: Bearer {token}`; route middleware is `auth:sanctum` + `throttle:60,1` only — the `extension` ability check is enforced in app code, not Sanctum ability middleware, via `ExtensionController::ensureExtensionToken()` at the top of every action):

| Method | Path | Name | Purpose |
|--------|------|------|---------|
| `GET` | `/api/extension/me` | `api.extension.me` | Confirm token; returns `{ name, email }` |
| `GET` | `/api/extension/resumes` | `api.extension.resumes` | Group + version picker payload |
| `GET` | `/api/extension/resumes/{resume}/fill-profile` | `api.extension.fill-profile` | Fill/insert payload for one version |

Payload builder: `App\Support\ResumeFillProfile`. Every action also checks `$user->disabled_at` (403 if disabled) and `fill-profile` additionally checks `$resume->user_id === $user->id` (404 otherwise) — a token can't read another user's resume.

**Sanctum config:** `config/sanctum.php` sets `'guard' => []` (intentionally empty) so only token-auth works for API requests.

**API tests:** extend `Tests\Feature\Api\ApiTestCase` (not `Tests\TestCase`). It calls `$this->app['auth']->forgetGuards()` before each request so token revocation is visible mid-test.

**CORS:** `config/cors.php` keeps `allowed_origins` empty. Chrome/Edge extensions with `host_permissions` for the app origin do not need browser CORS for background `fetch`.

**Legacy:** older activity/thread and job-saver API docs and the `extension/` popup that polls `/api/activity` target removed features — do not revive those endpoints without an explicit product decision. Apply is the live extension API surface.
