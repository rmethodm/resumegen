<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $query = trim((string) $request->query('q', ''));

        if ($query === '') {
            return response()->json(['resumes' => [], 'coverLetters' => []]);
        }

        $like = '%'.mb_strtolower($query).'%';
        $userId = $request->user()->id;

        $resumes = Resume::query()
            ->where('user_id', $userId)
            ->where(function ($q) use ($like) {
                $q->whereRaw('LOWER(title) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(full_name) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(headline) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(summary) LIKE ?', [$like]);
            })
            ->limit(5)
            ->get(['id', 'title'])
            ->map(fn (Resume $r) => [
                'id' => $r->id,
                'name' => $r->title,
                'url' => route('resumes.builder', $r->id),
            ])
            ->all();

        // Cover letters were removed (dd93ee34); keep the key so the palette contract holds.
        return response()->json([
            'resumes' => $resumes,
            'coverLetters' => [],
        ]);
    }
}
