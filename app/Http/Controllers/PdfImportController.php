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

        $request->validate([
            'file' => ['required', 'file', 'mimes:pdf', 'max:5120'],
        ]);

        try {
            $result = (new PdfResumeParser)->parse($request->file('file'), $request->user());
        } catch (\RuntimeException $e) {
            $message = $e->getMessage() === 'content_policy'
                ? 'Content policy violation'
                : $e->getMessage();

            return response()->json(['error' => $message], 422);
        }

        return response()->json($result);
    }

    public function confirm(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'data' => ['required', 'array'],
            'action' => ['required', 'in:new,overwrite'],
            'resume_id' => ['nullable', 'integer'],
            'name' => ['required_if:action,new', 'nullable', 'string', 'max:255'],
        ]);

        $user = $request->user();

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

        return redirect()->route('builder.edit', $resume)->with('pdfImported', true);
    }
}
