<?php

namespace App\Http\Controllers;

use App\Models\JobApplication;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class JobApplicationController extends Controller
{
    public function index(Request $request): Response
    {
        $applications = $request->user()
            ->jobApplications()
            ->with('resume:id,name')
            ->orderByDesc('updated_at')
            ->get([
                'id', 'company', 'role', 'status', 'resume_id',
                'applied_at', 'job_url', 'updated_at',
            ]);

        $resumes = $request->user()->resumes()->orderBy('name')->get(['id', 'name']);

        return Inertia::render('Jobs/Index', [
            'applications' => $applications,
            'resumes' => $resumes,
            'statuses' => JobApplication::STATUSES,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateData($request, true);
        $request->user()->jobApplications()->create($validated);

        return redirect()->route('jobs.index');
    }

    public function edit(Request $request, JobApplication $application): Response
    {
        $this->authorize('update', $application);
        $resumes = $request->user()->resumes()->orderBy('name')->get(['id', 'name']);

        return Inertia::render('Jobs/Edit', [
            'application' => $application,
            'resumes' => $resumes,
            'statuses' => JobApplication::STATUSES,
        ]);
    }

    public function update(Request $request, JobApplication $application)
    {
        $this->authorize('update', $application);
        $validated = $this->validateData($request, false);

        if (array_key_exists('resume_id', $validated) && $validated['resume_id'] !== null) {
            abort_unless(
                $request->user()->resumes()->whereKey($validated['resume_id'])->exists(),
                403
            );
        }

        $application->update($validated);

        return redirect()->route('jobs.index');
    }

    public function destroy(Request $request, JobApplication $application)
    {
        $this->authorize('delete', $application);
        $application->delete();

        return redirect()->route('jobs.index');
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
            'notes' => ['sometimes', 'nullable', 'string'],
            'job_url' => ['sometimes', 'nullable', 'url', 'max:500'],
        ]);
    }
}
