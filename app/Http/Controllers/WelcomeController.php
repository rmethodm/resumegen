<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class WelcomeController extends Controller
{
    /**
     * First-time visitors (no session, no returning cookie) are sent to the
     * builder subdomain's template picker to start a resume immediately.
     * The forever cookie makes every later visit land here as normal.
     */
    public function __invoke(Request $request): Response|RedirectResponse
    {
        $builderDomain = config('app.builder_domain');

        if (
            $request->user() === null
            && ! $request->hasCookie('rg_returning')
            && is_string($builderDomain)
            && $builderDomain !== ''
        ) {
            return redirect()
                ->away($request->getScheme().'://'.$builderDomain)
                ->withCookie(Cookie::forever('rg_returning', '1'));
        }

        if (! $request->hasCookie('rg_returning')) {
            Cookie::queue(Cookie::forever('rg_returning', '1'));
        }

        return Inertia::render('Welcome', [
            'canLogin' => Route::has('login'),
            'canRegister' => Route::has('register'),
        ]);
    }
}
