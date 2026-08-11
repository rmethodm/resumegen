<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreImportedJobsRequest;
use App\Models\ImportedJob;
use App\Services\JobImport\JobImportSearch;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

/**
 * Job Imports: search Adzuna/USAJOBS and save results a user chooses to
 * keep. AI job matching lives on ResumeAiController::matchJob, called from
 * this page with a chosen resume. Gap analysis and cover letters are NOT
 * part of this — those stay UI stubs on the frontend.
 */
class JobImportsController extends Controller
{
    public function __construct(private readonly JobImportSearch $search) {}

    public function index(Request $request): Response
    {
        $jobs = $request->user()->importedJobs()->latest('posted_at')->get();
        $resumes = $request->user()->resumes()->orderBy('title')->get(['id', 'title']);

        return Inertia::render('Jobs/Imports', [
            'jobs' => $jobs->map(fn (ImportedJob $job) => $this->present($job))->all(),
            'sourcesAvailable' => $this->search->availableSources(),
            'resumes' => $resumes->map(fn ($resume) => ['id' => $resume->id, 'title' => $resume->title])->all(),
        ]);
    }

    public function search(Request $request): JsonResponse
    {
        $data = $request->validate([
            'keyword' => ['required', 'string', 'min:2', 'max:150'],
            'location' => ['nullable', 'string', 'max:150'],
        ]);

        return response()->json([
            'results' => $this->search->search($data['keyword'], $data['location'] ?? null),
            'sourcesAvailable' => $this->search->availableSources(),
        ]);
    }

    public function store(StoreImportedJobsRequest $request): RedirectResponse
    {
        $data = $request->validated();

        foreach ($data['jobs'] as $job) {
            $request->user()->importedJobs()->firstOrCreate(
                ['source' => $job['source'], 'external_id' => $job['external_id']],
                [
                    'title' => $job['title'],
                    'company' => $job['company'] ?? null,
                    'location' => $job['location'] ?? null,
                    'url' => $job['url'] ?? null,
                    'salary' => $job['salary'] ?? null,
                    'description' => $job['description'] ?? null,
                    'posted_at' => $this->parseDate($job['posted_at'] ?? null),
                    'status' => 'New',
                    'raw' => $job,
                ],
            );
        }

        return back();
    }

    public function updateStatus(Request $request, ImportedJob $importedJob): RedirectResponse
    {
        abort_unless($importedJob->user_id === $request->user()->id, 404);

        $data = $request->validate([
            'status' => ['required', 'string', 'in:New,Saved,Tailoring,Applied,Archived'],
        ]);

        $importedJob->update(['status' => $data['status']]);

        return back();
    }

    /**
     * @return array{id: int, source: string, title: string, company: ?string, location: ?string, url: ?string, salary: ?string, description: ?string, posted_at: ?string, status: string}
     */
    private function present(ImportedJob $job): array
    {
        return [
            'id' => $job->id,
            'source' => $job->source,
            'title' => $job->title,
            'company' => $job->company,
            'location' => $job->location,
            'url' => $job->url,
            'salary' => $job->salary,
            'description' => $job->description,
            'posted_at' => $job->posted_at?->toIso8601String(),
            'status' => $job->status,
        ];
    }

    private function parseDate(?string $value): ?string
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        try {
            return Carbon::parse($value)->toDateTimeString();
        } catch (Throwable) {
            return null;
        }
    }
}
