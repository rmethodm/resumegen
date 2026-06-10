<?php

namespace App\Http\Controllers;

use App\Mail\NewPortfolioMessageMail;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PortfolioController extends Controller
{
    // Brand-protection slugs — these are not routing conflicts (portfolios live under /p/)
    // but are reserved to prevent impersonation or user confusion.
    private const RESERVED_SLUGS = [
        'admin', 'api', 'builder', 'career', 'jobs', 'cover-letters', 'billing',
        'profile', 'onboarding', 'register', 'login', 'logout', 'p', 'r',
        'password', 'dashboard', 'usage', 'webhooks', 'settings',
    ];

    public function show(Request $request, string $slug): Response
    {
        $user = User::where('portfolio_slug', $slug)
            ->where('portfolio_is_public', true)
            ->firstOrFail();

        $resumes = $user->resumes()
            ->whereHas('shareLinks', fn ($q) => $q
                ->where('is_active', true)
                ->where(fn ($q2) => $q2->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            )
            ->with(['shareLinks' => fn ($q) => $q
                ->where('is_active', true)
                ->where(fn ($q2) => $q2->whereNull('expires_at')->orWhere('expires_at', '>', now()))
                ->select('id', 'resume_id', 'token')
                ->limit(1),
            ])
            ->get(['id', 'name', 'template'])
            ->map(fn (Resume $r): array => [
                'id' => $r->id,
                'name' => $r->name,
                'template' => $r->template,
                'share_url' => $r->shareLinks->first()
                    ? route('public.resume', $r->shareLinks->first()->token)
                    : null,
            ]);

        $og = [
            'title' => $user->name."'s Portfolio — Resumegen",
            'description' => $user->portfolio_headline ?? 'Professional resume portfolio',
            'url' => route('portfolio.show', $slug),
            'image' => '',
        ];

        return Inertia::render('Portfolio/Show', [
            'owner' => [
                'name' => $user->name,
                'headline' => $user->portfolio_headline,
                'bio' => $user->portfolio_bio,
                'links' => $user->portfolio_links ?? [],
                'slug' => $slug,
            ],
            'resumes' => $resumes,
            'contactSent' => session()->pull('contactSent', false),
        ])->withViewData(['og' => $og]);
    }

    public function contact(Request $request, string $slug): RedirectResponse
    {
        $owner = User::where('portfolio_slug', $slug)
            ->where('portfolio_is_public', true)
            ->firstOrFail();

        $validated = $request->validate([
            'sender_name' => ['required', 'string', 'max:100'],
            'sender_email' => ['required', 'email'],
            'message' => ['required', 'string', 'max:2000'],
        ]);

        $message = $owner->portfolioMessages()->create($validated);

        Mail::to($owner)->queue(new NewPortfolioMessageMail($owner, $message));

        return back()->with('contactSent', true);
    }

    public function checkSlug(Request $request): JsonResponse
    {
        $request->validate([
            'slug' => ['required', 'string', 'min:3', 'max:30', 'regex:/^[a-z0-9][a-z0-9-]*[a-z0-9]$/'],
        ]);

        $slug = $request->input('slug');

        if (in_array($slug, self::RESERVED_SLUGS)) {
            return response()->json(['available' => false]);
        }

        $query = User::where('portfolio_slug', $slug);
        if ($request->user()) {
            $query->where('id', '!=', $request->user()->id);
        }

        return response()->json(['available' => ! $query->exists()]);
    }

    public function edit(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Settings/Portfolio', [
            'portfolioSlug' => $user->portfolio_slug,
            'portfolioHeadline' => $user->portfolio_headline,
            'portfolioBio' => $user->portfolio_bio,
            'portfolioIsPublic' => (bool) $user->portfolio_is_public,
            'portfolioLinks' => $user->portfolio_links ?? [],
            'portfolioUrl' => $user->portfolio_slug
                ? route('portfolio.show', $user->portfolio_slug)
                : null,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'portfolio_slug' => [
                'nullable',
                'string',
                'min:3',
                'max:30',
                'regex:/^[a-z0-9][a-z0-9-]*[a-z0-9]$/',
                Rule::unique('users', 'portfolio_slug')->ignore($user->id),
                Rule::notIn(self::RESERVED_SLUGS),
            ],
            'portfolio_headline' => ['nullable', 'string', 'max:150'],
            'portfolio_bio' => ['nullable', 'string', 'max:2000'],
            'portfolio_is_public' => ['required', 'boolean'],
            'portfolio_links' => ['nullable', 'array', 'max:10'],
            'portfolio_links.*.platform' => ['required', 'string', 'in:linkedin,github,x,website', 'distinct:strict'],
            'portfolio_links.*.url' => ['required', 'url', 'max:500'],
        ]);

        $user->update($validated);

        return back()->with('status', 'portfolio-updated');
    }
}
