<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminActionLog;
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

        $actions = AdminActionLog::query()
            ->with(['actor:id,name,email'])
            ->where('target_user_id', $user->id)
            ->orderByDesc('id')
            ->limit(25)
            ->get()
            ->map(fn (AdminActionLog $log) => [
                'id' => $log->id,
                'action' => $log->action,
                'created_at' => $log->created_at?->toIso8601String(),
                'actor' => $log->actor === null ? null : [
                    'id' => $log->actor->id,
                    'name' => $log->actor->name,
                    'email' => $log->actor->email,
                ],
            ]);

        return Inertia::render('Admin/Users/Show', [
            'user' => $this->detailPayload($user),
            'actions' => $actions,
        ]);
    }

    public function verifyEmail(Request $request, User $user): RedirectResponse
    {
        if ($user->email_verified_at === null) {
            $user->forceFill(['email_verified_at' => now()])->save();
            $this->record($request, $user, 'verify_email');
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
        $this->record($request, $user, 'disable');

        return redirect()
            ->route('admin.users.show', $user)
            ->with('success', 'User login disabled. Data was kept.');
    }

    public function enable(Request $request, User $user): RedirectResponse
    {
        $user->forceFill(['disabled_at' => null])->save();
        $this->record($request, $user, 'enable');

        return redirect()
            ->route('admin.users.show', $user)
            ->with('success', 'User login re-enabled.');
    }

    public function revokeTokens(Request $request, User $user): RedirectResponse
    {
        $user->tokens()->delete();
        $this->record($request, $user, 'revoke_tokens');

        return redirect()
            ->route('admin.users.show', $user)
            ->with('success', 'API tokens revoked.');
    }

    private function record(Request $request, User $target, string $action): void
    {
        $actor = $request->user();
        if ($actor === null) {
            return;
        }

        AdminActionLog::record($actor, $target, $action);

        Log::info('admin.user.'.$action, [
            'admin_id' => $actor->id,
            'user_id' => $target->id,
        ]);
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
