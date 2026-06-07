<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\ReferralEvent;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        event(new Registered($user));

        $referralCode = $request->session()->pull('referral_code');
        if ($referralCode) {
            $referrer = User::where('referral_code', $referralCode)->first();
            if ($referrer && $referrer->id !== $user->id) {
                $user->update(['referred_by_user_id' => $referrer->id]);
                ReferralEvent::create([
                    'referrer_user_id' => $referrer->id,
                    'referred_user_id' => $user->id,
                    'event_type' => 'signup',
                ]);
            }
        }

        Auth::login($user);

        return redirect(route('onboarding.show', absolute: false));
    }
}
