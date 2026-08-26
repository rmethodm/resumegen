<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use App\Http\Responses\LoginResponse;
use App\Http\Responses\RegisterResponse;
use App\Http\Responses\VerifiedResponse;
use App\Models\User;
use Illuminate\Auth\Events\Failed;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;
use Laravel\Fortify\Contracts\RegisterResponse as RegisterResponseContract;
use Laravel\Fortify\Contracts\VerifyEmailResponse as VerifyEmailResponseContract;
use Laravel\Fortify\Features;
use Laravel\Fortify\Fortify;
use Throwable;

class FortifyServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(LoginResponseContract::class, LoginResponse::class);
        $this->app->singleton(RegisterResponseContract::class, RegisterResponse::class);
        $this->app->singleton(VerifyEmailResponseContract::class, VerifiedResponse::class);
    }

    public function boot(): void
    {
        $this->configureActions();
        $this->configureViews();
        $this->configureRateLimiting();
        $this->configureAdminLoginFailureLogging();
    }

    private function configureActions(): void
    {
        Fortify::createUsersUsing(CreateNewUser::class);
        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);

        Fortify::authenticateUsing(function (Request $request): ?User {
            /** @var User|null $user */
            $user = User::query()
                ->where(Fortify::username(), $request->input(Fortify::username()))
                ->first();

            if ($user === null || ! Hash::check((string) $request->input('password'), $user->password)) {
                return null;
            }

            if ($user->isDisabled()) {
                throw ValidationException::withMessages([
                    Fortify::username() => __('This account has been disabled.'),
                ]);
            }

            return $user;
        });
    }

    private function configureViews(): void
    {
        Fortify::loginView(fn (Request $request) => Inertia::render('Auth/Login', [
            'canResetPassword' => Features::enabled(Features::resetPasswords()),
            'status' => $request->session()->get('status'),
        ]));

        Fortify::registerView(fn () => Inertia::render('Auth/Register'));

        Fortify::requestPasswordResetLinkView(fn (Request $request) => Inertia::render('Auth/ForgotPassword', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::resetPasswordView(fn (Request $request) => Inertia::render('Auth/ResetPassword', [
            'email' => $request->email,
            'token' => $request->route('token'),
        ]));

        Fortify::verifyEmailView(fn (Request $request) => Inertia::render('Auth/VerifyEmail', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::confirmPasswordView(fn () => Inertia::render('Auth/ConfirmPassword'));
    }

    private function configureRateLimiting(): void
    {
        RateLimiter::for('login', function (Request $request) {
            $throttleKey = Str::transliterate(Str::lower($request->input(Fortify::username())).'|'.$request->ip());

            $adminDomain = config('app.admin_domain');
            $onAdminHost = is_string($adminDomain)
                && $adminDomain !== ''
                && $request->getHost() === $adminDomain;

            // Tighter budget on the support panel login surface.
            if ($onAdminHost) {
                return Limit::perMinute(3)->by('admin-login|'.$throttleKey);
            }

            return Limit::perMinute(5)->by($throttleKey);
        });

        // Fortify's own routes.php has no config hook to throttle password.email
        // (unlike login), so the route is hardened here after Fortify registers it.
        Route::getRoutes()->getByName('password.email')?->middleware('throttle:6,1');
    }

    private function configureAdminLoginFailureLogging(): void
    {
        Event::listen(Failed::class, function (Failed $event): void {
            try {
                $request = request();
                $adminDomain = config('app.admin_domain');
                $onAdminHost = is_string($adminDomain)
                    && $adminDomain !== ''
                    && $request->getHost() === $adminDomain;

                if (! $onAdminHost) {
                    return;
                }

                Log::warning('admin.login_failed', [
                    'email' => $event->credentials[Fortify::username()] ?? null,
                    'ip' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                    'had_user' => $event->user !== null,
                ]);
            } catch (Throwable $e) {
                report($e);
            }
        });
    }
}
