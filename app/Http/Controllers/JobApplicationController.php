<?php

namespace App\Http\Controllers;

use App\Models\JobApplication;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
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
    private const STATUSES = ['saved', 'applied', 'interviewing', 'offer', 'rejected'];

    public function index(Request $request): Response
    {
        $applications = $request->user()->jobApplications()->latest()->get();
        $resumes = $request->user()->resumes()->orderBy('title')->get(['id', 'title']);

        return Inertia::render('Jobs/Kanban', [
            'applications' => $applications->map(fn (JobApplication $job) => $this->present($job))->all(),
            'resumes' => $resumes->map(fn ($resume) => ['id' => $resume->id, 'title' => $resume->title])->all(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);

        $request->user()->jobApplications()->create([
            ...$data,
            'status' => $data['status'] ?? 'saved',
        ]);

        return back();
    }

    public function update(Request $request, JobApplication $jobApplication): RedirectResponse
    {
        abort_unless($jobApplication->user_id === $request->user()->id, 404);

        $jobApplication->update($this->validated($request, sometimes: true));

        return back();
    }

    public function destroy(Request $request, JobApplication $jobApplication): RedirectResponse
    {
        abort_unless($jobApplication->user_id === $request->user()->id, 404);

        $jobApplication->delete();

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, bool $sometimes = false): array
    {
        $required = $sometimes ? 'sometimes' : 'required';

        return $request->validate([
            'company' => [$required, 'string', 'max:255'],
            'role' => [$required, 'string', 'max:255'],
            'resume_id' => ['nullable', 'integer', Rule::exists('resumes', 'id')->where('user_id', $request->user()->id)],
            'job_url' => ['nullable', 'string', 'max:500'],
            'status' => ['sometimes', 'string', Rule::in(self::STATUSES)],
            'applied_at' => ['nullable', 'date'],
            'follow_up_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);
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
