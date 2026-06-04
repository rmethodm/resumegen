<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobApplication;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class JobApplicationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $applications = $request->user()
            ->jobApplications()
            ->with('resume:id,name')
            ->orderByDesc('updated_at')
            ->get(['id', 'company', 'role', 'status', 'resume_id', 'applied_at', 'job_url', 'updated_at']);

        return response()->json(['data' => $applications]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateData($request, true);

        if (!empty($validated['job_url'])) {
            $exists = $request->user()
                ->jobApplications()
                ->where('job_url', $validated['job_url'])
                ->exists();

            if ($exists) {
                return response()->json(['message' => 'A job with this URL already exists.'], 409);
            }
        }

        $application = $request->user()->jobApplications()->create($validated);

        return response()->json($application, 201);
    }

    public function show(JobApplication $job): JsonResponse
    {
        $this->authorize('view', $job);

        return response()->json($job);
    }

    public function update(Request $request, JobApplication $job): JsonResponse
    {
        $this->authorize('update', $job);

        $validated = $this->validateData($request, false);

        if (array_key_exists('resume_id', $validated) && $validated['resume_id'] !== null) {
            abort_unless(
                $request->user()->resumes()->whereKey($validated['resume_id'])->exists(),
                403
            );
        }

        $job->update($validated);

        return response()->json($job->fresh());
    }

    public function destroy(JobApplication $job): Response
    {
        $this->authorize('delete', $job);
        $job->delete();

        return response()->noContent();
    }

    private function validateData(Request $request, bool $creating): array
    {
        $req = $creating ? 'required' : 'sometimes';

        return $request->validate([
            'company' => [$req, 'string', 'max:255'],
            'role' => [$req, 'string', 'max:255'],
            'status' => [$req, 'in:'.implode(',', JobApplication::STATUSES)],
            'resume_id' => ['sometimes', 'nullable', 'integer', 'exists:resumes,id'],
            'applied_at' => ['sometimes', 'nullable', 'date'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'job_url' => ['sometimes', 'nullable', 'url', 'max:500'],
        ]);
    }
}
