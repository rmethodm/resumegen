<?php

namespace App\Http\Controllers;

use App\Models\JobListing;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class JobListingController extends Controller
{
    public function index(Request $request): Response
    {
        $query = JobListing::query();

        if ($q = $request->string('q')->trim()->toString()) {
            $query->where(function ($sub) use ($q) {
                $sub->where('title', 'like', "%{$q}%")
                    ->orWhere('description', 'like', "%{$q}%");
            });
        }

        if ($location = $request->string('location')->trim()->toString()) {
            $query->where('location', 'like', "%{$location}%");
        }

        if ($company = $request->string('company')->trim()->toString()) {
            $query->where('company', 'like', "%{$company}%");
        }

        $listings = $query->latest('id')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (JobListing $listing) => [
                'id' => $listing->id,
                'title' => $listing->title,
                'company' => $listing->company,
                'location' => $listing->location,
                'job_url' => $listing->job_url,
            ]);

        $resumes = $request->user()->resumes()->select('id', 'title')->latest('updated_at')->get();

        return Inertia::render('Jobs/Browse', [
            'listings' => $listings,
            'resumes' => $resumes,
            'filters' => [
                'q' => $request->string('q')->toString() ?: null,
                'location' => $request->string('location')->toString() ?: null,
                'company' => $request->string('company')->toString() ?: null,
            ],
        ]);
    }
}
