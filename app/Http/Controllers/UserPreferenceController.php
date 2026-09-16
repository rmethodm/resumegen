<?php

namespace App\Http\Controllers;

use App\Support\AppThemes;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Small per-user UI preferences that do not belong on the Profile form. */
class UserPreferenceController extends Controller
{
    public function dismissChecklist(Request $request): RedirectResponse
    {
        $request->user()->update(['dismissed_checklist_at' => now()]);

        return back();
    }

    public function setApplyWizardPreference(Request $request): RedirectResponse
    {
        $request->validate(['prefers_apply_wizard' => ['required', 'boolean']]);

        $request->user()->update(['prefers_apply_wizard' => $request->boolean('prefers_apply_wizard')]);

        return back();
    }

    public function setTheme(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'theme' => ['nullable', 'string', Rule::in(AppThemes::IDS)],
        ]);

        $request->user()->update(['theme' => $validated['theme'] ?? null]);

        return back();
    }
}
