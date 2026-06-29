<?php

namespace App\Http\Controllers;

use App\Models\AdminAuditLog;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class AdminImpersonationController extends Controller
{
    public function store(Request $request, User $user): RedirectResponse
    {
        if ($user->is_master_admin) {
            return back()->with('error', 'Cannot impersonate a master admin.');
        }

        if ($user->id === $request->user()->id) {
            return back()->with('error', 'Cannot impersonate yourself.');
        }

        session([
            'impersonating_id' => $user->id,
            'impersonator_id' => $request->user()->id,
        ]);

        auth()->login($user);
        session()->regenerate();

        return redirect()->route('dashboard');
    }

    public function destroy(Request $request): RedirectResponse
    {
        if (! session()->has('impersonating_id')) {
            return redirect()->route('dashboard');
        }

        $impersonatorId = session()->pull('impersonator_id');
        session()->forget('impersonating_id');

        if ($impersonatorId) {
            $admin = User::find($impersonatorId);
            if ($admin && $admin->is_master_admin) {
                AdminAuditLog::record('user.impersonate.stop', $admin, "Stopped impersonating user ID {$impersonatorId}");
                auth()->login($admin);
                session()->regenerate();
            }
        }

        return redirect('https://'.config('app.admin_domain').'/resources/users');
    }
}
