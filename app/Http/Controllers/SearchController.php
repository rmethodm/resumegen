<?php

namespace App\Http\Controllers;

use App\Models\CoverLetter;
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
            ->where('is_snapshot', false)
            ->whereRaw('LOWER(search_text) LIKE ?', [$like])
            ->limit(5)
            ->get(['id', 'name'])
            ->map(fn (Resume $r) => [
                'id' => $r->id,
                'name' => $r->name,
                'url' => route('builder.edit', $r->id),
            ])
            ->all();

        $coverLetters = CoverLetter::query()
            ->where('user_id', $userId)
            ->where(function ($q) use ($like) {
                $q->whereRaw('LOWER(name) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(body) LIKE ?', [$like]);
            })
            ->limit(5)
            ->get(['id', 'name'])
            ->map(fn (CoverLetter $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'url' => route('cover-letters.edit', $c->id),
            ])
            ->all();

        return response()->json([
            'resumes' => $resumes,
            'coverLetters' => $coverLetters,
        ]);
    }
}
