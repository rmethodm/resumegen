<?php

namespace App\Http\Controllers;

use App\Data\SkillCategories;
use App\Models\JobRole;
use App\Models\JobSkill;
use App\Models\JobTitle;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AutocompleteController extends Controller
{
    public function searchRoles(Request $request): JsonResponse
    {
        $request->validate(['q' => ['nullable', 'string', 'max:150']]);

        return $this->search(JobRole::class, 'title', (string) $request->query('q', ''));
    }

    public function searchTitles(Request $request): JsonResponse
    {
        $request->validate(['q' => ['nullable', 'string', 'max:150']]);

        return $this->search(JobTitle::class, 'title', (string) $request->query('q', ''));
    }

    public function searchSkills(Request $request): JsonResponse
    {
        $request->validate(['q' => ['nullable', 'string', 'max:150']]);

        $bucket = (string) $request->query('category', '');
        $categories = $bucket !== '' ? SkillCategories::categoriesFor($bucket) : [];

        return $this->search(JobSkill::class, 'name', (string) $request->query('q', ''), $categories);
    }

    public function storeRole(Request $request): JsonResponse
    {
        return $this->store(JobRole::class, 'title', $request, ['source' => 'user']);
    }

    public function storeTitle(Request $request): JsonResponse
    {
        return $this->store(JobTitle::class, 'title', $request, ['source' => 'user']);
    }

    public function storeSkills(Request $request): JsonResponse
    {
        return $this->store(JobSkill::class, 'name', $request, ['category' => 'User Added']);
    }

    /**
     * @param  class-string<Model>  $model
     * @param  list<string>  $categories
     */
    private function search(string $model, string $column, string $q, array $categories = []): JsonResponse
    {
        $q = trim($q);
        if (mb_strlen($q) < 2) {
            return response()->json([]);
        }

        $escaped = addcslashes($q, '%_\\');

        $results = $model::where($column, 'like', $escaped.'%')
            ->when($categories, fn ($query) => $query->whereIn('category', $categories))
            ->orderBy($column)
            ->limit(10)
            ->get(['id', $column]);

        if ($results->count() < 3) {
            $results = $model::where($column, 'like', '%'.$escaped.'%')
                ->when($categories, fn ($query) => $query->whereIn('category', $categories))
                ->orderBy($column)
                ->limit(10)
                ->get(['id', $column]);
        }

        return response()->json($results);
    }

    /**
     * @param  class-string<Model>  $model
     * @param  array<string, mixed>  $createAttributes
     */
    private function store(string $model, string $column, Request $request, array $createAttributes = []): JsonResponse
    {
        $request->validate([
            $column => ['required', 'string', 'min:2', 'max:150'],
        ]);

        $value = mb_convert_case(
            mb_strtolower(trim($request->string($column)->toString())),
            MB_CASE_TITLE,
            'UTF-8'
        );

        $record = $model::firstOrCreate([$column => $value], $createAttributes);

        return response()->json(['id' => $record->id, $column => $record->{$column}]);
    }
}
