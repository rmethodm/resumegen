<?php

namespace App\Actions;

use App\Models\JobApplication;
use App\Models\Resume;
use App\Models\User;
use App\Support\ResumeDocument;
use Illuminate\Support\Facades\DB;

/**
 * Create a Kanban card and, when a base resume is given, a tailored
 * sibling version of it (same ResumeGroup) carrying the job's company,
 * role, and description. The base is never modified. Both the web
 * controller and the extension API call this so the two paths cannot
 * drift.
 */
class CreateJobApplication
{
    /**
     * @param  array<string, mixed>  $data  Validated StoreJobApplicationRequest data.
     */
    public function handle(User $user, array $data): JobApplication
    {
        $baseResumeId = $data['base_resume_id'] ?? null;
        $jobDescription = $data['job_description'] ?? null;
        unset($data['base_resume_id'], $data['job_description']);

        $status = $data['status'] ?? 'saved';

        return DB::transaction(function () use ($user, $data, $status, $baseResumeId, $jobDescription): JobApplication {
            $application = $user->jobApplications()->create([
                ...$data,
                'status' => $status,
            ]);

            DB::table('job_application_status_events')->insert([
                'job_application_id' => $application->id,
                'from_status' => null,
                'to_status' => $status,
                'created_at' => now(),
            ]);

            if ($baseResumeId !== null) {
                /** @var Resume $base */
                $base = $user->resumes()->findOrFail($baseResumeId);
                $version = $this->tailoredVersion($user, $base, $application, $jobDescription);
                $application->update(['resume_id' => $version->id]);
            }

            return $application;
        });
    }

    private function tailoredVersion(User $user, Resume $base, JobApplication $application, ?string $jobDescription): Resume
    {
        $document = ResumeDocument::toArray($base);
        $document['title'] = "{$application->company} – {$application->role}";
        $document['target_company'] = $application->company;
        $document['target_role'] = $application->role;
        $document['target_job_description'] = $jobDescription ?? '';

        $version = $user->resumes()->create([
            'title' => $document['title'],
            'group_id' => $base->group_id,
        ]);

        ResumeDocument::save($version, $document);

        return $version;
    }
}
