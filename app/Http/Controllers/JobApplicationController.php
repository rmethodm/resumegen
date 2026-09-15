<?php

namespace App\Http\Controllers;

use App\Actions\CreateJobApplication;
use App\Http\Requests\StoreJobApplicationRequest;
use App\Http\Requests\UpdateJobApplicationRequest;
use App\Models\JobApplication;
use App\Models\Resume;
use App\Support\ResumeAnalysis;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Job Application Kanban: track applications through Saved, Applied,
 * Interviewing, Offer, and Rejected, plus a per-round interview log
 * (see JobApplicationInterviewController). Contact management stays out
 * of scope (see CLAUDE.md "Removed Features").
 */
class JobApplicationController extends Controller
{
    public function index(Request $request): Response
    {
        $applications = $request->user()->jobApplications()->with('interviews')->latest()->get();
        $resumes = $request->user()->resumes()
            ->with(['experiences', 'skills'])
            ->latest('updated_at')
            ->get();

        return Inertia::render('Jobs/Kanban', [
            'applications' => $applications->map(fn (JobApplication $job) => $this->present($job))->all(),
            'resumes' => $resumes->map(fn (Resume $resume) => [
                'id' => $resume->id,
                'title' => $resume->title,
                'score' => ResumeAnalysis::score($resume),
            ])->all(),
        ]);
    }

    public function store(StoreJobApplicationRequest $request, CreateJobApplication $createJobApplication): RedirectResponse
    {
        $application = $createJobApplication->handle($request->user(), $request->validated());

        if (isset($request->validated()['base_resume_id'])) {
            return to_route('resumes.workstation', $application->resume_id);
        }

        return to_route('job-applications.index');
    }

    public function update(UpdateJobApplicationRequest $request, JobApplication $jobApplication): RedirectResponse
    {
        $data = $request->validated();

        if (array_key_exists('status', $data) && $data['status'] !== $jobApplication->status) {
            DB::table('job_application_status_events')->insert([
                'job_application_id' => $jobApplication->id,
                'from_status' => $jobApplication->status,
                'to_status' => $data['status'],
                'created_at' => now(),
            ]);
        }

        $jobApplication->update($data);

        return back();
    }

    public function destroy(Request $request, JobApplication $jobApplication): RedirectResponse
    {
        abort_unless($jobApplication->user_id === $request->user()->id, 404);

        $jobApplication->delete();

        return back();
    }

    /**
     * @return array{id: int, company: string, role: string, status: string, resume_id: ?int, job_url: ?string, notes: ?string, applied_at: ?string, follow_up_at: ?string, created_at: ?string, interviews: array<int, array{id: int, round: int, scheduled_at: ?string, type: ?string, notes: ?string}>}
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
            'interviews' => $job->interviews->map(fn ($interview) => [
                'id' => $interview->id,
                'round' => $interview->round,
                'scheduled_at' => $interview->scheduled_at?->toIso8601String(),
                'type' => $interview->type,
                'notes' => $interview->notes,
            ])->all(),
        ];
    }
}
