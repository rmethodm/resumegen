<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreJobApplicationRequest;
use App\Http\Requests\UpdateJobApplicationRequest;
use App\Models\JobApplication;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Job Application Kanban: track applications through Saved, Applied,
 * Interviewing, Offer, and Rejected. Contact management and interview
 * notes are NOT part of this — those were removed features and stay
 * out of scope (see CLAUDE.md "Removed Features").
 */
class JobApplicationController extends Controller
{
    public function index(Request $request): Response
    {
        $applications = $request->user()->jobApplications()->latest()->get();
        $resumes = $request->user()->resumes()->orderBy('title')->get(['id', 'title']);

        return Inertia::render('Jobs/Kanban', [
            'applications' => $applications->map(fn (JobApplication $job) => $this->present($job))->all(),
            'resumes' => $resumes->map(fn ($resume) => ['id' => $resume->id, 'title' => $resume->title])->all(),
        ]);
    }

    public function store(StoreJobApplicationRequest $request): RedirectResponse
    {
        $data = $request->validated();

        $request->user()->jobApplications()->create([
            ...$data,
            'status' => $data['status'] ?? 'saved',
        ]);

        return back();
    }

    public function update(UpdateJobApplicationRequest $request, JobApplication $jobApplication): RedirectResponse
    {
        $jobApplication->update($request->validated());

        return back();
    }

    public function destroy(Request $request, JobApplication $jobApplication): RedirectResponse
    {
        abort_unless($jobApplication->user_id === $request->user()->id, 404);

        $jobApplication->delete();

        return back();
    }

    /**
     * @return array{id: int, company: string, role: string, status: string, resume_id: ?int, job_url: ?string, notes: ?string, applied_at: ?string, follow_up_at: ?string, created_at: ?string}
     */
    private function present(JobApplication $job): array
    {
        return [
            'id' => $job->id,
            'company' => $job->company,
            'role' => $job->role,
            'status' => $job->status,
            'resume_id' => $job->resume_id,
            'job_url' => $job->job_url,
            'notes' => $job->notes,
            'applied_at' => $job->applied_at?->toDateString(),
            'follow_up_at' => $job->follow_up_at?->toDateString(),
            'created_at' => $job->created_at?->toIso8601String(),
        ];
    }
}
