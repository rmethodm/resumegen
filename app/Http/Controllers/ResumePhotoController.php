<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ResumePhotoController extends Controller
{
    public function store(Request $request, Resume $resume): RedirectResponse
    {
        $this->authorize('update', $resume);

        $request->validate([
            'photo' => ['required', 'image', 'max:2048'],
        ]);

        $resume->clearMediaCollection('photo');
        $resume->addMediaFromRequest('photo')->toMediaCollection('photo');

        return back();
    }

    public function destroy(Resume $resume): RedirectResponse
    {
        $this->authorize('update', $resume);

        $resume->clearMediaCollection('photo');

        return back();
    }
}
