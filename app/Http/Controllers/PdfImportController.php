<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use App\Services\PdfResumeParser;
use App\Services\UserLimits;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class PdfImportController extends Controller
{
    public function extract(Request $request): JsonResponse
    {
        if (! UserLimits::canPdfImport($request->user())) {
            return response()->json(['error' => 'Upgrade required', 'required_tier' => 'starter'], 402);
        }

        $validated = $request->validate([
            'file' => ['required', 'file', 'mimes:pdf', 'max:5120'],
            'hint' => ['nullable', 'string', 'in:generic,linkedin'],
        ]);

        $hint = $validated['hint'] ?? 'generic';

        try {
            $result = (new PdfResumeParser)->parse($request->file('file'), $request->user(), $hint);
        } catch (\RuntimeException $e) {
            $message = $e->getMessage() === 'content_policy'
                ? 'Content policy violation'
                : $e->getMessage();

            return response()->json(['error' => $message], 422);
        }

        return response()->json(array_merge($result, ['hint' => $hint]));
    }

    public function confirm(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'data' => ['required', 'array'],
            'action' => ['required', 'in:new,overwrite'],
            'resume_id' => ['nullable', 'integer'],
            'name' => ['required_if:action,new', 'nullable', 'string', 'max:255'],
            'hint' => ['nullable', 'string', 'in:generic,linkedin'],
        ]);

        $user = $request->user();
        $hint = $validated['hint'] ?? 'generic';

        if ($validated['action'] === 'new') {
            $resume = $user->resumes()->create(array_merge(
                ['name' => $validated['name']],
                $validated['data'],
            ));
        } else {
            $resume = Resume::findOrFail($validated['resume_id']);
            $this->authorize('update', $resume);
            $resume->update($validated['data']);
        }

        $flashKey = $hint === 'linkedin' ? 'linkedInImported' : 'pdfImported';

        return redirect()->route('builder.edit', $resume)->with($flashKey, true);
    }
}
