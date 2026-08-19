### API layer (token-based: Resumegen Apply + mobile apps)

A JSON API lives under the `/api` prefix alongside the Inertia web layer. Auth uses Laravel Sanctum personal access tokens — **not** session cookies. Two client surfaces share it, distinguished by token ability (enforced in app code, not Sanctum ability middleware).

#### Extension surface (ability `extension`)

Tokens are issued from the web app only (`POST /profile/extension-tokens` via `ExtensionTokenController`, name `Resumegen Apply`). Plaintext is flashed once on create.

**Endpoints** (all require `Authorization: Bearer {token}`; route middleware is `auth:sanctum` + `throttle:60,1` only — the ability check runs via `ExtensionController::ensureExtensionToken()` at the top of every action):

| Method | Path | Name | Purpose |
|--------|------|------|---------|
| `GET` | `/api/extension/me` | `api.extension.me` | Confirm token; returns `{ name, email }` |
| `GET` | `/api/extension/resumes` | `api.extension.resumes` | Group + version picker payload |
| `GET` | `/api/extension/resumes/{resume}/fill-profile` | `api.extension.fill-profile` | Fill/insert payload for one version |

Payload builder: `App\Support\ResumeFillProfile`. Every action also checks `$user->disabled_at` (403 if disabled) and `fill-profile` additionally checks `$resume->user_id === $user->id` (404 otherwise) — a token can't read another user's resume.

#### Mobile surface (ability `mobile`, for the iPhone/iPad apps)

Identity in `App\Support\MobileApiToken` (name `Resumegen Mobile`); the ability + disabled-account guards live in `App\Concerns\GuardsMobileTokens`, called at the top of every action. Tokens come from either the Profile page (web) or `POST /api/auth/token` — password login, `throttle:5,1`, refusing unverified (403), disabled (403), and 2FA-enabled accounts (403 — password-only login must not bypass 2FA; those users use the Profile-page flow). `DELETE /api/auth/token` revokes the calling token.

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/resumes` | List; `?since=` returns only changed rows plus a `deleted` id array (from `resume_deletions`) |
| `POST` | `/api/resumes` | Create; optional `client_uuid` makes offline retries idempotent (repeat returns 200, not a duplicate) |
| `GET/PUT/DELETE` | `/api/resumes/{id}` | Full `ResumeDocument` round-trip; stale `base_updated_at` on PUT → **409 carrying the current server document**; base version delete → 403 |
| `GET` | `/api/resumes/{id}/pdf` | Inline DomPDF stream, same render as web export |
| `GET/POST` | `/api/resumes/{id}/share` | Read / idempotently create the share link |
| `PUT/DELETE` | `/api/share-links/{id}` | Update settings (email gate, password, download, expiry) / revoke |

Deletion log: `Resume::booted()`'s `deleting` hook inserts into `resume_deletions` on every hard delete (web or API) so `?since=` pulls learn about them. Ownership 404s throughout; tests in `tests/Feature/Api/Mobile*Test.php`.

**Sanctum config:** `config/sanctum.php` sets `'guard' => []` (intentionally empty) so only token-auth works for API requests.

**API tests:** extend `Tests\Feature\Api\ApiTestCase` (not `Tests\TestCase`). It calls `$this->app['auth']->forgetGuards()` before each request so token revocation is visible mid-test.

**CORS:** `config/cors.php` keeps `allowed_origins` empty. Chrome/Edge extensions with `host_permissions` for the app origin do not need browser CORS for background `fetch`.

**Legacy:** older activity/thread and job-saver API docs and the `extension/` popup that polls `/api/activity` target removed features — do not revive those endpoints without an explicit product decision. Apply is the live extension API surface.
