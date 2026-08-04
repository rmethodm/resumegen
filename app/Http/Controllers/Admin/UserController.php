<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        $q = trim((string) $request->query('q', ''));

        $users = User::query()
            ->withCount('resumes')
            ->when($q !== '', function ($query) use ($q) {
                $like = '%'.addcslashes($q, '%_\\').'%';
                $query->where(function ($inner) use ($like, $q) {
                    $inner->where('email', 'like', $like)
                        ->orWhere('name', 'like', $like);

                    if (ctype_digit($q)) {
                        $inner->orWhere('id', (int) $q);
                    }
                });
            })
            ->orderByDesc('id')
            ->paginate(25)
            ->withQueryString()
            ->through(fn (User $user) => $this->listPayload($user));

        return Inertia::render('Admin/Users/Index', [
            'users' => $users,
            'filters' => [
                'q' => $q,
            ],
        ]);
    }

    public function show(User $user): Response
    {
        $user->loadCount('resumes');

        return Inertia::render('Admin/Users/Show', [
            'user' => $this->detailPayload($user),
        ]);
    }

    public function verifyEmail(Request $request, User $user): RedirectResponse
    {
        if ($user->email_verified_at === null) {
            $user->forceFill(['email_verified_at' => now()])->save();
            Log::info('admin.user.verify_email', [
                'admin_id' => $request->user()?->id,
                'user_id' => $user->id,
            ]);
        }

        return redirect()
            ->route('admin.users.show', $user)
            ->with('success', 'Email marked as verified.');
    }

    public function disable(Request $request, User $user): RedirectResponse
    {
        abort_if($user->is($request->user()), 403, 'You cannot disable your own account.');

        $user->forceFill(['disabled_at' => now()])->save();
        $user->tokens()->delete();

        Log::info('admin.user.disable', [
            'admin_id' => $request->user()?->id,
            'user_id' => $user->id,
        ]);

        return redirect()
            ->route('admin.users.show', $user)
            ->with('success', 'User login disabled. Data was kept.');
    }

    public function enable(Request $request, User $user): RedirectResponse
    {
        $user->forceFill(['disabled_at' => null])->save();

        Log::info('admin.user.enable', [
            'admin_id' => $request->user()?->id,
            'user_id' => $user->id,
        ]);

        return redirect()
            ->route('admin.users.show', $user)
            ->with('success', 'User login re-enabled.');
    }

    public function revokeTokens(Request $request, User $user): RedirectResponse
    {
        $user->tokens()->delete();

        Log::info('admin.user.revoke_tokens', [
            'admin_id' => $request->user()?->id,
            'user_id' => $user->id,
        ]);

        return redirect()
            ->route('admin.users.show', $user)
            ->with('success', 'API tokens revoked.');
    }

    /**
     * @return array<string, mixed>
     */
    private function listPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'email_verified_at' => $user->email_verified_at?->toIso8601String(),
            'is_admin' => $user->isAdmin(),
            'disabled_at' => $user->disabled_at?->toIso8601String(),
            'created_at' => $user->created_at?->toIso8601String(),
            'resumes_count' => $user->resumes_count ?? 0,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function detailPayload(User $user): array
    {
        return [
            ...$this->listPayload($user),
            'tokens_count' => $user->tokens()->count(),
            'has_two_factor' => $user->hasTwoFactorEnabled(),
            'registration_ip' => $user->registration_ip,
            'updated_at' => $user->updated_at?->toIso8601String(),
        ];
    }
}
