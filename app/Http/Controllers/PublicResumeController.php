<?php
namespace App\Http\Controllers;

use App\Models\ResumeShareLink;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PublicResumeController extends Controller
{
    public function show(string $token): Response
    {
        $link = ResumeShareLink::with('resume')->where('token', $token)->firstOrFail();

        abort_if(! $link->is_active, 403, 'This link has been deactivated.');

        return Inertia::render('ResumeBuilder/PublicView', [
            'resume' => $link->resume,
            'token'  => $token,
        ]);
    }

    public function storeQuestion(Request $request, string $token)
    {
        $link = ResumeShareLink::with('resume')->where('token', $token)->firstOrFail();

        abort_if(! $link->is_active, 403, 'This link has been deactivated.');

        $validated = $request->validate([
            'sender_name'  => ['required', 'string', 'max:150'],
            'sender_email' => ['required', 'email', 'max:150'],
            'sender_phone' => ['required', 'string', 'max:30'],
            'message'      => ['required', 'string', 'max:2000'],
        ]);

        $link->questions()->create([
            ...$validated,
            'resume_id' => $link->resume_id,
        ]);

        return back()->with('questionSubmitted', true);
    }
}
