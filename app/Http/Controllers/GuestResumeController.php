<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use App\Models\User;
use App\Support\ResumeDocument;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

/**
 * Guest (no-account) resume creation from the builder subdomain.
 *
 * A guest is a real User row with a non-null guest_token — every existing
 * ownership check, autosave route, and export works untouched. The token is
 * the credential: GET /w/{token} on the main host logs the guest in. Token
 * shape is "{slug}-{suffix}" where the random suffix keeps it unguessable
 * and the slug is user-editable from the workstation's welcome modal.
 */
class GuestResumeController extends Controller
{
    /** Template picker — the builder subdomain's landing page. */
    public function picker(): Response
    {
        return Inertia::render('Builder/TemplatePicker', [
            'templates' => ResumeDocument::TEMPLATES,
        ]);
    }

    /**
     * Create the guest account + resume for the chosen template, then hand
     * off to the main host's /w/{token} login link (sessions are host-only,
     * so logging in here on the builder host would be useless).
     */
    public function start(Request $request): HttpResponse
    {
        $validated = $request->validate([
            'template' => ['required', 'string', Rule::in(ResumeDocument::TEMPLATES)],
        ]);

        $user = DB::transaction(function () use ($validated): User {
            $user = new User;
            $user->name = 'Guest';
            $user->email = 'guest-'.Str::uuid().'@guest.resumegen.app';
            $user->password = Hash::make(Str::random(40));
            $user->email_verified_at = now();
            $user->has_completed_onboarding = true;
            $user->guest_token = self::freshToken();
            $user->save();

            $resume = $user->resumes()->create([
                'title' => 'Untitled resume',
                'template' => $validated['template'],
            ]);
            // Editor never opens on nothing — same seed as ResumeController.
            $resume->experiences()->create(['position' => 0, 'bullets' => []]);

            return $user;
        });

        // Cross-origin hand-off (builder host → main host): a plain 302 dies
        // in Inertia's XHR under CORS; Inertia::location does a full-page visit.
        return Inertia::location(
            self::mainUrl('/w/'.$user->guest_token.'?welcome=1'),
        );
    }

    /** The bookmarkable link: log the guest in and open their resume. */
    public function open(Request $request, string $token): RedirectResponse
    {
        $user = User::query()
            ->where('guest_token', $token)
            ->whereNull('disabled_at')
            ->first();

        abort_if($user === null, 404);

        Auth::login($user, remember: true);
        $request->session()->regenerate();

        $resume = $user->resumes()->latest('id')->first();

        if ($resume === null) {
            return to_route('dashboard');
        }

        $redirect = to_route('resumes.workstation', $resume);

        if ($request->boolean('welcome')) {
            $redirect->with('guest_welcome', true);
        }

        return $redirect;
    }

    /** Rename the editable slug half of the link; the random suffix stays. */
    public function updateLink(Request $request): RedirectResponse
    {
        $user = $request->user();

        abort_if($user->guest_token === null, 404);

        $validated = $request->validate([
            'slug' => ['required', 'string', 'max:40', 'regex:/^[a-z0-9]+(-[a-z0-9]+)*$/'],
        ]);

        $suffix = Str::afterLast($user->guest_token, '-');
        $token = $validated['slug'].'-'.$suffix;

        if ($token !== $user->guest_token && User::query()->where('guest_token', $token)->exists()) {
            return back()->withErrors(['slug' => 'That link is taken — try another name.']);
        }

        $user->guest_token = $token;
        $user->save();

        return back();
    }

    private static function freshToken(): string
    {
        // The token is a login credential. 16 lowercase alphanumerics
        // (~82 bits, CSPRNG via Str::random) — strong against online
        // guessing behind the 20/min throttle while staying short enough
        // to read out of a bookmark bar. Lowercase so the URL survives
        // being retyped or shouted across a room.
        do {
            $token = 'my-resume-'.Str::lower(Str::random(16));
        } while (User::query()->where('guest_token', $token)->exists());

        return $token;
    }

    private static function mainUrl(string $path): string
    {
        return rtrim((string) config('app.url'), '/').$path;
    }
}
