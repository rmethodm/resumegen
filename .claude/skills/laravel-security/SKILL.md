---
name: laravel-security
description: "Apply when setting up Laravel security headers, rate limiting, audit logging, or file-upload validation not already covered by laravel-best-practices. Use for CSP/security-header middleware, RateLimiter::for() throttle definitions, security event audit logging, and MIME-whitelisted file upload with signed-URL download."
license: MIT
metadata:
  origin: ECC (https://github.com/affaan-m/ECC), trimmed to this app's gaps
---

# Laravel Security — gaps not covered by laravel-best-practices

This app has no `SecurityHeaders` middleware, no per-route rate limiter beyond Fortify defaults, and no security-event audit log. Use these patterns when adding any of that.

## Security Headers Middleware

```php
// App\Http\Middleware\SecurityHeaders
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): mixed
    {
        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set(
            'Content-Security-Policy',
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'"
        );

        return $response;
    }
}
```

Register globally in `bootstrap/app.php` (or `Kernel::$middleware` on older skeletons). CSP `script-src 'self'` requires no inline `<script>` — check Vite output doesn't inject inline scripts before enabling.

## Rate Limiting

Define named limiters in `AppServiceProvider::boot()` (this app doesn't use `RouteServiceProvider` for this):

```php
RateLimiter::for('auth', function (Request $request) {
    return Limit::perMinute(5)->by($request->ip())
        ->response(fn () => response()->json(['message' => 'Too many attempts.'], 429));
});

RateLimiter::for('uploads', function (Request $request) {
    return Limit::perHour(10)->by($request->user()?->id ?? $request->ip());
});
```

Apply via `->middleware('throttle:auth')` on the route. Check Fortify's own throttle config first (`config/fortify.php` `limiters`) before adding a duplicate.

## Security Event Audit Log

```php
// config/logging.php channels
'security' => [
    'driver' => 'single',
    'path' => storage_path('logs/security.log'),
    'level' => 'warning',
],
```

```php
final class SecurityLogger
{
    public static function log(string $event, array $context = []): void
    {
        Log::channel('security')->warning($event, array_merge([
            'user_id' => Auth::id(),
            'ip' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'url' => request()->fullUrl(),
            'timestamp' => now()->toIso8601String(),
        ], $context));
    }
}
```

Use for: failed login, password change, 2FA disable, role/permission change, disabled-account access attempt. Fits the "best-effort system logging" pattern already used elsewhere in this app (try/catch, never blocks the request).

## File Upload Security

```php
public function rules(): array
{
    return [
        'document' => ['required', 'file', 'mimes:pdf,doc,docx', 'max:10240', 'extensions:pdf,doc,docx'],
    ];
}
```

```php
// Store outside public disk, serve via signed temporary URL
$path = $request->file('document')->store('documents', 'local');
$url = Storage::temporaryUrl($path, now()->addMinutes(15));
```

This app has no media/upload feature currently (photo upload was removed) — apply this only if a new upload feature is added.

## Quick Checklist

| Check | This app's current state |
|-------|---------------------------|
| `APP_DEBUG=false` in prod | verify in prod `.env` |
| `$fillable` whitelisted, never `$guarded = []` | already the convention — keep it |
| CSRF active | Laravel default, unchanged |
| Rate limiting beyond Fortify defaults | **gap** — add per-endpoint if abuse risk exists |
| Security headers middleware | **gap** — not present |
| Security event audit log | **gap** — not present |
| `composer audit` in CI | check `.github/workflows/ci.yml` |

## Related

- `laravel-best-practices` — general Laravel patterns (this repo's primary skill, check first)
