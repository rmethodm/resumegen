<?php

namespace App\Http\Controllers;

use App\Services\AbuseFilter;
use App\Services\ResumeGenerator;
use App\Services\UserLimits;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ResumeGeneratorController extends Controller
{
    public function generate(Request $request): RedirectResponse|JsonResponse
    {
        $user = $request->user();

        if (! UserLimits::canGenerate($user)) {
            if ($request->expectsJson()) {
                return response()->json(['error' => 'Upgrade required', 'required_tier' => 'starter'], 402);
            }

            return back()->with('featureGate', ['feature' => 'generate', 'requiredTier' => 'starter']);
        }

        $validated = $request->validate([
            'target_role' => ['required', 'string', 'max:100'],
            'years_experience' => ['required', 'integer', 'min:0', 'max:40'],
            'industry' => ['required', 'string', 'max:100'],
            'key_skills' => ['required', 'array', 'max:10'],
            'key_skills.*' => ['string', 'max:50'],
        ]);

        $textFields = [$validated['target_role'], $validated['industry'], ...$validated['key_skills']];
        foreach ($textFields as $text) {
            if (AbuseFilter::check($text)) {
                return response()->json(['error' => 'Content policy violation'], 422);
            }
        }

        try {
            $data = (new ResumeGenerator)->generate($validated, $user);
        } catch (\RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        $resume = $user->resumes()->create(array_merge(
            ['name' => $validated['target_role'].' Resume'],
            $data,
        ));

        return redirect()->route('builder.edit', $resume)->with('resumeGenerated', true);
    }
}
