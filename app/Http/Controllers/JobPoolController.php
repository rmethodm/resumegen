<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreJobPoolEntryRequest;
use App\Models\JobPoolEntry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class JobPoolController extends Controller
{
    public function index(Request $request): Response
    {
        $entries = $request->user()->jobPoolEntries()
            ->with(['jobListing', 'resume'])
            ->latest('id')
            ->get()
            ->map(fn (JobPoolEntry $entry) => [
                'id' => $entry->id,
                'job_listing_id' => $entry->job_listing_id,
                'title' => $entry->jobListing->title,
                'company' => $entry->jobListing->company,
                'location' => $entry->jobListing->location,
                'job_url' => $entry->jobListing->job_url,
                'resume_id' => $entry->resume_id,
                'resume_title' => $entry->resume->title,
            ]);

        return Inertia::render('Jobs/Pool', [
            'entries' => $entries,
        ]);
    }

    public function store(StoreJobPoolEntryRequest $request): RedirectResponse
    {
        $request->user()->jobPoolEntries()->create($request->validated());

        return back();
    }

    public function destroy(Request $request, JobPoolEntry $jobPoolEntry): RedirectResponse
    {
        abort_unless($jobPoolEntry->user_id === $request->user()->id, 404);

        $jobPoolEntry->delete();

        return back();
    }
}
