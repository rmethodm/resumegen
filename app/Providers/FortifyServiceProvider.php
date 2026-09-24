<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use App\Http\Responses\LoginResponse;
use App\Http\Responses\RegisterResponse;
use App\Http\Responses\VerifiedResponse;
use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
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

            // Always pay for one hash check, even for an unknown email, so
            // response time doesn't reveal which addresses have accounts.
            $passwordMatches = Hash::check(
                (string) $request->input('password'),
                $user?->password ?? self::dummyHash(),
            );

            if ($user === null || ! $passwordMatches) {
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

    private static function dummyHash(): string
    {
        // once(), not a function static: it is flushed between tests, so a
        // test that mocks Hash cannot leak its fake hash into later tests.
        return once(fn () => Hash::make('fortify-auth-timing-dummy'));
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

            // The per-IP cap stops one address spraying many emails
            // (credential stuffing), which the email|IP key alone allows.
            return [
                Limit::perMinute(5)->by($throttleKey),
                Limit::perMinute(30)->by($request->ip()),
            ];
        });

        // Fortify has no limiter config for these two. Must run after boot with
        // the name index refreshed: Fortify names routes after adding them, and
        // a boot-time getByName() used to return null and skip this silently.
        $this->app->booted(function (): void {
            $routes = Route::getRoutes();
            $routes->refreshNameLookups();

            foreach (['password.email', 'password.confirm.store'] as $name) {
                $routes->getByName($name)->middleware('throttle:6,1');
            }
        });
    }
}
