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
            return response()->json(['resumes' => []]);
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

        return response()->json([
            'resumes' => $resumes,
        ]);
    }
}
