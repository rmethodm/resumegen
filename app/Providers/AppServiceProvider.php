<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use SocialiteProviders\Manager\SocialiteWasCalled;
use SocialiteProviders\Microsoft\MicrosoftExtendSocialite;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Belt-and-braces with SESSION_SECURE_COOKIE's production default:
        // generated URLs never downgrade to http even behind a proxy.
        if ($this->app->isProduction()) {
            URL::forceScheme('https');
        }

        Vite::prefetch(concurrency: 3);

        RateLimiter::for('share-unlock', function (Request $request) {
            return Limit::perMinute(10)->by($request->route('token').'|'.$request->ip());
        });

        // Google and GitHub are built into Socialite; Microsoft needs the
        // community SocialiteProviders package registered via this event.
        Event::listen(SocialiteWasCalled::class, MicrosoftExtendSocialite::class);
    }
}
