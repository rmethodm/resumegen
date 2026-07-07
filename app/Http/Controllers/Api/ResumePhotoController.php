<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Resume;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ResumePhotoController extends Controller
{
    public function store(Request $request, Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);

        $request->validate([
            'photo' => ['required', 'image', 'max:2048'],
        ]);

        $resume->clearMediaCollection('photo');
        $resume->addMediaFromRequest('photo')->toMediaCollection('photo');

        return response()->json(['photo_url' => $resume->getFirstMediaUrl('photo')]);
    }

    public function destroy(Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);

        $resume->clearMediaCollection('photo');

        return response()->json(['photo_url' => null]);
    }
}
