<?php

namespace App\Http\Controllers;

use App\Models\JobRole;
use App\Models\JobTitle;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AutocompleteController extends Controller
{
    public function searchRoles(Request $request): JsonResponse
    {
        return $this->search(JobRole::class, (string) $request->query('q', ''));
    }

    public function searchTitles(Request $request): JsonResponse
    {
        return $this->search(JobTitle::class, (string) $request->query('q', ''));
    }

    public function storeRole(Request $request): JsonResponse
    {
        return $this->store(JobRole::class, $request);
    }

    public function storeTitle(Request $request): JsonResponse
    {
        return $this->store(JobTitle::class, $request);
    }

    private function search(string $model, string $q): JsonResponse
    {
        $q = trim($q);
        if (mb_strlen($q) < 2) {
            return response()->json([]);
        }

        /** @var class-string<Model> $model */
        $results = $model::where('title', 'like', $q.'%')
            ->orderBy('title')
            ->limit(10)
            ->get(['id', 'title']);

        if ($results->count() < 3) {
            $results = $model::where('title', 'like', '%'.$q.'%')
                ->orderBy('title')
                ->limit(10)
                ->get(['id', 'title']);
        }

        return response()->json($results);
    }

    private function store(string $model, Request $request): JsonResponse
    {
        $request->validate([
            'title' => ['required', 'string', 'min:2', 'max:150'],
        ]);

        $title = mb_convert_case(
            mb_strtolower(trim($request->string('title')->toString())),
            MB_CASE_TITLE,
            'UTF-8'
        );

        /** @var class-string<Model> $model */
        $record = $model::firstOrCreate(['title' => $title]);

        return response()->json(['id' => $record->id, 'title' => $record->title]);
    }
}
