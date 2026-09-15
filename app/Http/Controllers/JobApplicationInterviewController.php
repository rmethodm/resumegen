<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreJobApplicationInterviewRequest;
use App\Http\Requests\UpdateJobApplicationInterviewRequest;
use App\Models\JobApplication;
use App\Models\JobApplicationInterview;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class JobApplicationInterviewController extends Controller
{
    public function store(StoreJobApplicationInterviewRequest $request, JobApplication $jobApplication): RedirectResponse
    {
        $nextRound = ((int) $jobApplication->interviews()->max('round')) + 1;

        $jobApplication->interviews()->create([
            ...$request->validated(),
            'round' => $nextRound,
        ]);

        return back();
    }

    public function update(UpdateJobApplicationInterviewRequest $request, JobApplication $jobApplication, JobApplicationInterview $interview): RedirectResponse
    {
        $interview->update($request->validated());

        return back();
    }

    public function destroy(Request $request, JobApplication $jobApplication, JobApplicationInterview $interview): RedirectResponse
    {
        abort_unless(
            $jobApplication->user_id === $request->user()->id
                && $interview->job_application_id === $jobApplication->id,
            404
        );

        $interview->delete();

        return back();
    }
}
