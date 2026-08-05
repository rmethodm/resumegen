<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use App\Services\UserLimits;
use App\Support\ResumeFillProfile;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use PragmaRX\Google2FA\Google2FA;

class ProfileController extends Controller
{
    public function edit(Request $request): Response
    {
        $user = $request->user();
        $google2fa = new Google2FA;

        $qrCodeSvg = null;
        if ($user->two_factor_secret && ! $user->hasTwoFactorEnabled()) {
            $qrCodeUrl = $google2fa->getQRCodeUrl(
                config('app.name'),
                $user->email,
                $user->two_factor_secret
            );
            $writer = new Writer(new ImageRenderer(
                new RendererStyle(200),
                new SvgImageBackEnd
            ));
            $qrCodeSvg = $writer->writeString($qrCodeUrl);
        }

        $extensionTokens = $user->tokens()
            ->where('name', ResumeFillProfile::TOKEN_NAME)
            ->orderByDesc('created_at')
            ->get(['id', 'name', 'last_used_at', 'created_at'])
            ->map(fn ($token): array => [
                'id' => $token->id,
                'name' => $token->name,
                'last_used_at' => $token->last_used_at?->toIso8601String(),
                'created_at' => $token->created_at?->toIso8601String(),
            ])
            ->values()
            ->all();

        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $user instanceof MustVerifyEmail,
            'status' => session('status'),
            'profile' => $user->profile ?? [],
            'persona' => [
                'target_role' => $user->target_role,
                'industry' => $user->industry,
                'years_experience' => $user->years_experience,
                'preferred_template' => $user->preferred_template,
            ],
            'allowedTemplates' => UserLimits::allTemplates(),
            'twoFactor' => [
                'enabled' => $user->hasTwoFactorEnabled(),
                'pending' => $user->two_factor_secret !== null && ! $user->hasTwoFactorEnabled(),
                'qrCodeSvg' => $qrCodeSvg,
                'recoveryCodes' => session('two_factor_recovery_codes'),
            ],
            'extensionTokens' => $extensionTokens,
            'extensionTokenPlain' => session('extension_token_plain'),
        ]);
    }

    /**
     * Update the user's persona profile (contact defaults).
     */
    public function updatePersona(Request $request): RedirectResponse
    {
        $request->validate([
            'full_name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'string', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'linkedin_url' => ['nullable', 'url', 'max:255'],
            'website' => ['nullable', 'url', 'max:255'],
            'target_role' => ['nullable', 'string', 'max:100'],
            'industry' => ['nullable', 'string', 'max:100'],
            'years_experience' => ['nullable', 'integer', 'min:0', 'max:40'],
            'preferred_template' => ['nullable', 'string', Rule::in(UserLimits::allTemplates())],
        ]);

        $user = $request->user();

        $contactFields = array_filter(
            $request->only(['full_name', 'email', 'phone', 'location', 'linkedin_url', 'website']),
            fn ($v) => $v !== null,
        );

        if ($contactFields) {
            $user->update(['profile' => array_merge($user->profile ?? [], $contactFields)]);
        }

        $personaFields = array_filter(
            $request->only(['target_role', 'industry', 'years_experience', 'preferred_template']),
            fn ($v) => $v !== null && $v !== '',
        );

        if ($personaFields) {
            $user->update($personaFields);
        }

        return Redirect::route('profile.edit');
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return Redirect::route('profile.edit');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}
