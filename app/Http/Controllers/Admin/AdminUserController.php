<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminUserController extends Controller
{
    public function index(): Response
    {
        $users = User::query()
            ->withCount('resumes')
            ->orderBy('created_at')
            ->paginate(15)
            ->through(fn (User $user) => [
                'id'              => $user->id,
                'name'            => $user->name,
                'email'           => $user->email,
                'is_pro'          => $user->is_pro,
                'is_master_admin' => $user->is_master_admin,
                'subscribed'      => $user->subscribed('default'),
                'resumes_count'   => $user->resumes_count,
                'created_at'      => $user->created_at->toDateString(),
            ]);

        return Inertia::render('Admin/Users/Index', [
            'users' => $users,
        ]);
    }

    public function togglePro(Request $request, User $user): RedirectResponse
    {
        if ($user->is_master_admin) {
            return back()->with('error', 'Cannot modify a master admin.');
        }

        $user->update(['is_pro' => ! $user->is_pro]);

        $label = $user->is_pro ? 'upgraded to Pro' : 'downgraded to Free';

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

        $user->delete();

        return back()->with('success', "{$user->name} has been deleted.");
    }
}
