<?php

namespace App\Http\Controllers;

use App\Models\ApplicationContact;
use App\Models\JobApplication;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ApplicationContactController extends Controller
{
    public function store(Request $request, JobApplication $application): JsonResponse
    {
        if ($application->user_id !== $request->user()->id) {
            abort(403);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'role' => ['nullable', 'string', 'max:100'],
            'email' => ['nullable', 'string', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $contact = $application->contacts()->create([
            ...$validated,
            'user_id' => $request->user()->id,
        ]);

        return response()->json($contact, 201);
    }

    public function destroy(Request $request, JobApplication $application, ApplicationContact $contact): Response
    {
        if ($contact->user_id !== $request->user()->id) {
            abort(403);
        }

        $contact->delete();

        return response()->noContent();
    }
}
