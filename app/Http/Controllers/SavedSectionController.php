<?php

namespace App\Http\Controllers;

use App\Models\SavedSection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SavedSectionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(
            $request->user()->savedSections()->latest()->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'type' => ['required', 'string', 'max:50'],
            'fields' => ['required', 'array'],
            'fields.*.id' => ['required', 'string'],
            'fields.*.type' => ['required', 'string'],
            'fields.*.label' => ['required', 'string', 'max:100'],
        ]);

        $section = $request->user()->savedSections()->create($validated);

        return response()->json($section, 201);
    }

    public function destroy(Request $request, SavedSection $savedSection): JsonResponse
    {
        $this->authorize('delete', $savedSection);
        $savedSection->delete();

        return response()->json(null, 204);
    }
}
