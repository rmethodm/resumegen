<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\CoverLetter;
use App\Models\JobApplication;
use App\Models\Resume;
use App\Models\ResumeShareLink;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminContentController extends Controller
{
    private const TYPES = ['resumes', 'cover-letters', 'jobs', 'portfolios'];

    public function index(Request $request): Response
    {
        $type = in_array($request->input('type'), self::TYPES, true) ? $request->input('type') : 'resumes';
        $q = trim((string) $request->input('q', ''));

        $items = match ($type) {
            'cover-letters' => $this->coverLetters($q),
            'jobs' => $this->jobs($q),
            'portfolios' => $this->portfolios($q),
            default => $this->resumes($q),
        };

        return Inertia::render('Admin/Content/Index', [
            'type' => $type,
            'items' => $items,
            'counts' => [
                'resumes' => Resume::nonSnapshot()->count(),
                'cover-letters' => CoverLetter::count(),
                'jobs' => JobApplication::count(),
                'portfolios' => User::whereNotNull('portfolio_slug')->count(),
            ],
            'filters' => ['q' => $q],
            'flash' => session()->only(['success', 'error']),
        ]);
    }

    private function resumes(string $q)
    {
        return Resume::nonSnapshot()
            ->with('user:id,name,email')
            ->withCount('shareLinks')
            ->when($q !== '', fn ($query) => $query->where(fn ($w) => $w
                ->where('name', 'like', "%{$q}%")
                ->orWhereHas('user', fn ($u) => $u->where('email', 'like', "%{$q}%")->orWhere('name', 'like', "%{$q}%"))
            ))
            ->latest()
            ->paginate(25)
            ->withQueryString()
            ->through(fn (Resume $r): array => [
                'id' => $r->id,
                'name' => $r->name,
                'template' => $r->template,
                'is_master' => $r->is_master,
                'share_links_count' => $r->share_links_count,
                'owner' => $this->owner($r->user),
                'created_at' => $r->created_at,
            ]);
    }

    private function coverLetters(string $q)
    {
        return CoverLetter::with('user:id,name,email')
            ->when($q !== '', fn ($query) => $query->where(fn ($w) => $w
                ->where('name', 'like', "%{$q}%")
                ->orWhereHas('user', fn ($u) => $u->where('email', 'like', "%{$q}%")->orWhere('name', 'like', "%{$q}%"))
            ))
            ->latest()
            ->paginate(25)
            ->withQueryString()
            ->through(fn (CoverLetter $c): array => [
                'id' => $c->id,
                'name' => $c->name,
                'template_key' => $c->template_key,
                'owner' => $this->owner($c->user),
                'created_at' => $c->created_at,
            ]);
    }

    private function jobs(string $q)
    {
        return JobApplication::with('user:id,name,email')
            ->when($q !== '', fn ($query) => $query->where(fn ($w) => $w
                ->where('company', 'like', "%{$q}%")
                ->orWhere('role', 'like', "%{$q}%")
                ->orWhereHas('user', fn ($u) => $u->where('email', 'like', "%{$q}%")->orWhere('name', 'like', "%{$q}%"))
            ))
            ->latest()
            ->paginate(25)
            ->withQueryString()
            ->through(fn (JobApplication $j): array => [
                'id' => $j->id,
                'company' => $j->company,
                'role' => $j->role,
                'status' => $j->status,
                'owner' => $this->owner($j->user),
                'created_at' => $j->created_at,
            ]);
    }

    private function portfolios(string $q)
    {
        return User::whereNotNull('portfolio_slug')
            ->when($q !== '', fn ($query) => $query->where(fn ($w) => $w
                ->where('portfolio_slug', 'like', "%{$q}%")
                ->orWhere('email', 'like', "%{$q}%")
            ))
            ->latest()
            ->paginate(25)
            ->withQueryString()
            ->through(fn (User $u): array => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'portfolio_slug' => $u->portfolio_slug,
                'portfolio_is_public' => (bool) $u->portfolio_is_public,
            ]);
    }

    public function showResume(Resume $resume): Response
    {
        $resume->load('user:id,name,email');

        return Inertia::render('Admin/Content/Resume', [
            'resume' => [
                'id' => $resume->id,
                'name' => $resume->name,
                'template' => $resume->template,
                'owner' => $this->owner($resume->user),
                'contact' => $resume->contact,
                'summary' => $resume->summary,
                'experience' => $resume->experience,
                'education' => $resume->education,
                'skills' => $resume->skills,
                'certifications' => $resume->certifications,
                'custom_sections' => $resume->custom_sections,
            ],
        ]);
    }

    public function destroyResume(Resume $resume): RedirectResponse
    {
        AdminAuditLog::record('content.resume.delete', $resume, "Deleted resume \"{$resume->name}\" ({$resume->user?->email})");
        $resume->delete();

        return back()->with('success', 'Resume deleted.');
    }

    public function destroyCoverLetter(CoverLetter $coverLetter): RedirectResponse
    {
        AdminAuditLog::record('content.cover-letter.delete', $coverLetter, "Deleted cover letter \"{$coverLetter->name}\" ({$coverLetter->user?->email})");
        $coverLetter->delete();

        return back()->with('success', 'Cover letter deleted.');
    }

    public function destroyJob(JobApplication $jobApplication): RedirectResponse
    {
        AdminAuditLog::record('content.job.delete', $jobApplication, "Deleted job application {$jobApplication->company} ({$jobApplication->user?->email})");
        $jobApplication->delete();

        return back()->with('success', 'Job application deleted.');
    }

    public function disableShareLink(ResumeShareLink $shareLink): RedirectResponse
    {
        $shareLink->update(['is_active' => false]);
        AdminAuditLog::record('content.share-link.disable', $shareLink, 'Disabled a public share link', ['resume_id' => $shareLink->resume_id]);

        return back()->with('success', 'Share link disabled.');
    }

    public function unpublishPortfolio(User $user): RedirectResponse
    {
        $user->update(['portfolio_is_public' => false]);
        AdminAuditLog::record('content.portfolio.unpublish', $user, "Unpublished portfolio for {$user->email}", ['slug' => $user->portfolio_slug]);

        return back()->with('success', 'Portfolio unpublished.');
    }

    /**
     * @return array{id: int, name: string|null, email: string|null}|null
     */
    private function owner(?User $user): ?array
    {
        return $user ? ['id' => $user->id, 'name' => $user->name, 'email' => $user->email] : null;
    }
}
