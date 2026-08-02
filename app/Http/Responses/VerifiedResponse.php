<?php

namespace App\Http\Responses;

use Illuminate\Http\RedirectResponse;
use Laravel\Fortify\Contracts\VerifyEmailResponse as VerifyEmailResponseContract;

class VerifiedResponse implements VerifyEmailResponseContract
{
    public function toResponse($request): RedirectResponse
    {
        return redirect()->intended(route('dashboard', absolute: false).'?verified=1');
    }
}
