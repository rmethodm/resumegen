<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateResumeGroupRequest;
use App\Models\ResumeGroup;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ResumeGroupController extends Controller
{
    /**
     * Rename a version group. Ownership 404s rather than 403s, matching the
     * rest of the app — a 403 would confirm the group exists.
     */
    public function update(UpdateResumeGroupRequest $request, ResumeGroup $resumeGroup): RedirectResponse
    {
        $resumeGroup->update($request->validated());

        return back();
    }

    /**
     * Delete a whole resume. Only allowed with a single version — a real
     * 403, not the app's usual existence-hiding 404, mirroring
     * ResumeController::destroy's base-version guard: the card is visibly
     * there on the dashboard with the action disabled once it has siblings.
     * Deleting the group cascades to its one Resume row via the FK.
     */
    public function destroy(Request $request, ResumeGroup $resumeGroup): RedirectResponse
    {
        abort_unless($resumeGroup->user_id === $request->user()->id, 404);

        abort_if($resumeGroup->resumes()->count() > 1, 403);

        $resumeGroup->delete();

        return to_route('dashboard');
    }
}
