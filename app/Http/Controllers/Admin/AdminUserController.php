<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminUserController extends Controller
{
    public function index(Request $request): Response
    {
        $query = User::query()
            ->with('subscriptions')
            ->withCount(['resumes', 'coverLetters', 'jobApplications']);

        if ($request->filled('q')) {
            $q = $request->string('q');
            $query->where(fn ($sub) => $sub
                ->where('name', 'like', "%{$q}%")
                ->orWhere('email', 'like', "%{$q}%")
            );
        }

        if ($request->filled('plan') && $request->input('plan') !== 'all') {
            $query->where('plan_tier', $request->input('plan'));
        }

        $users = $query->latest('users.created_at')->paginate(25)->withQueryString()
            ->through(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_pro' => $user->is_pro,
                'is_agency' => $user->is_agency,
                'is_master_admin' => $user->is_master_admin,
                'plan_tier' => $user->plan_tier ?? 'free',
                'subscribed' => $user->subscribed('default'),
                'resumes_count' => $user->resumes_count,
                'cover_letters_count' => $user->cover_letters_count,
                'job_applications_count' => $user->job_applications_count,
                'portfolio_slug' => $user->portfolio_slug,
                'created_at' => $user->created_at->toDateString(),
            ]);

        return Inertia::render('Admin/Users/Index', [
            'users' => $users,
            'filters' => $request->only(['q', 'plan']),
            'flash' => session()->only(['success', 'error']),
        ]);
    }

    public function togglePro(Request $request, User $user): RedirectResponse
    {
        if ($user->is_master_admin) {
            return back()->with('error', 'Cannot modify a master admin.');
        }

        $user->update(['is_pro' => ! $user->is_pro]);

        $label = $user->is_pro ? 'upgraded to Pro' : 'downgraded to Free';

        AdminAuditLog::record('user.toggle-pro', $user, "{$user->email} {$label}", ['is_pro' => $user->is_pro]);

        return back()->with('success', "{$user->name} has been {$label}.");
    }

    public function toggleAgency(Request $request, User $user): RedirectResponse
    {
        if ($user->is_master_admin) {
            return back()->with('error', 'Cannot modify a master admin.');
        }

        $user->update(['is_agency' => ! $user->is_agency]);

        $label = $user->is_agency ? 'upgraded to Agency' : 'downgraded from Agency';

        AdminAuditLog::record('user.toggle-agency', $user, "{$user->email} {$label}", ['is_agency' => $user->is_agency]);

        return back()->with('success', "{$user->name} has been {$label}.");
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        if ($user->id === $request->user()->id) {
            return back()->with('error', 'You cannot delete your own account.');
        }

        if ($user->is_master_admin) {
            return back()->with('error', 'Cannot delete a master admin.');
        }

        $user->subscription('default')?->cancelNow();

        AdminAuditLog::record('user.delete', $user, "Deleted user {$user->email}", ['name' => $user->name]);

        $user->delete();

        return back()->with('success', "{$user->name} has been deleted.");
    }
}
