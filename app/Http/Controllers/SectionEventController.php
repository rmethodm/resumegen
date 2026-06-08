<?php

namespace App\Http\Controllers;

use App\Models\ResumeSectionEvent;
use App\Models\ResumeShareLink;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SectionEventController extends Controller
{
    public function store(Request $request, string $token): JsonResponse
    {
        $link = ResumeShareLink::where('token', $token)->where('is_active', true)->first();

        if (! $link || ($link->expires_at && $link->expires_at->isPast())) {
            return response()->json(['ok' => false], 404);
        }

        $validated = $request->validate([
            'sections' => ['required', 'array', 'max:20'],
            'sections.*.section' => ['required', 'string', 'max:50', 'regex:/^(summary|experience|education|skills|certifications|custom_[a-z0-9_]+)$/'],
            'sections.*.dwell_ms' => ['required', 'integer', 'min:0'],
        ]);

        $ipHash = hash('sha256', $request->ip() ?? '');

        try {
            foreach ($validated['sections'] as $item) {
                ResumeSectionEvent::create([
                    'resume_id' => $link->resume_id,
                    'section' => $item['section'],
                    'dwell_ms' => min((int) $item['dwell_ms'], 120000),
                    'ip_hash' => $ipHash,
                ]);
            }

            return response()->json(['ok' => true]);
        } catch (\Throwable) {
            return response()->json(['ok' => false]);
        }
    }
}
