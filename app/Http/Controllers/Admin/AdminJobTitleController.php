<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\JobRole;
use App\Models\JobSkill;
use App\Models\JobTitle;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AdminJobTitleController extends Controller
{
    public function index(Request $request): Response
    {
        $tab = $request->input('tab', 'roles');
        $q = $request->input('q', '');

        $rolesQuery = JobRole::query();
        $titlesQuery = JobTitle::query();
        $skillsQuery = JobSkill::query();

        if ($q) {
            $rolesQuery->where('title', 'like', "%{$q}%");
            $titlesQuery->where('title', 'like', "%{$q}%");
            $skillsQuery->where('name', 'like', "%{$q}%");
        }

        return Inertia::render('Admin/JobTitles/Index', [
            'roles' => $rolesQuery->orderBy('title')->paginate(50, ['*'], 'roles_page')->withQueryString(),
            'titles' => $titlesQuery->orderBy('title')->paginate(50, ['*'], 'titles_page')->withQueryString(),
            'skills' => $skillsQuery->orderBy('name')->paginate(50, ['*'], 'skills_page')->withQueryString(),
            'categories' => JobSkill::query()->distinct()->orderBy('category')->pluck('category'),
            'tab' => $tab,
            'filters' => ['q' => $q],
        ]);
    }

    public function storeRole(Request $request): RedirectResponse
    {
        $request->validate(['title' => ['required', 'string', 'min:2', 'max:150']]);
        JobRole::firstOrCreate(['title' => $this->titleCase($request->string('title')->toString())]);

        return back()->with('success', 'Role added.');
    }

    public function updateRole(Request $request, JobRole $role): RedirectResponse
    {
        $request->validate(['title' => ['required', 'string', 'min:2', 'max:150', Rule::unique('job_roles', 'title')->ignore($role->id)]]);
        $role->update(['title' => $this->titleCase($request->string('title')->toString())]);

        return back()->with('success', 'Role updated.');
    }

    public function destroyRole(JobRole $role): RedirectResponse
    {
        $role->delete();

        return back()->with('success', 'Role deleted.');
    }

    public function bulkDestroyRoles(Request $request): RedirectResponse
    {
        $request->validate(['ids' => ['required', 'array', 'min:1'], 'ids.*' => ['integer']]);
        JobRole::whereIn('id', $request->input('ids'))->delete();

        return back()->with('success', 'Roles deleted.');
    }

    public function storeTitle(Request $request): RedirectResponse
    {
        $request->validate(['title' => ['required', 'string', 'min:2', 'max:150']]);
        JobTitle::firstOrCreate(['title' => $this->titleCase($request->string('title')->toString())]);

        return back()->with('success', 'Title added.');
    }

    public function updateTitle(Request $request, JobTitle $title): RedirectResponse
    {
        $request->validate(['title' => ['required', 'string', 'min:2', 'max:150', Rule::unique('job_titles', 'title')->ignore($title->id)]]);
        $title->update(['title' => $this->titleCase($request->string('title')->toString())]);

        return back()->with('success', 'Title updated.');
    }

    public function destroyTitle(JobTitle $title): RedirectResponse
    {
        $title->delete();

        return back()->with('success', 'Title deleted.');
    }

    public function bulkDestroyTitles(Request $request): RedirectResponse
    {
        $request->validate(['ids' => ['required', 'array', 'min:1'], 'ids.*' => ['integer']]);
        JobTitle::whereIn('id', $request->input('ids'))->delete();

        return back()->with('success', 'Titles deleted.');
    }

    public function storeSkill(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:150'],
            'category' => ['required', 'string', 'min:2', 'max:100'],
        ]);

        JobSkill::firstOrCreate([
            'name' => $this->titleCase($request->string('name')->toString()),
            'category' => $this->titleCase($request->string('category')->toString()),
        ]);

        return back()->with('success', 'Skill added.');
    }

    public function updateSkill(Request $request, JobSkill $skill): RedirectResponse
    {
        $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:150'],
            'category' => ['required', 'string', 'min:2', 'max:100'],
        ]);

        $skill->update([
            'name' => $this->titleCase($request->string('name')->toString()),
            'category' => $this->titleCase($request->string('category')->toString()),
        ]);

        return back()->with('success', 'Skill updated.');
    }

    public function destroySkill(JobSkill $skill): RedirectResponse
    {
        $skill->delete();

        return back()->with('success', 'Skill deleted.');
    }

    public function bulkDestroySkills(Request $request): RedirectResponse
    {
        $request->validate(['ids' => ['required', 'array', 'min:1'], 'ids.*' => ['integer']]);
        JobSkill::whereIn('id', $request->input('ids'))->delete();

        return back()->with('success', 'Skills deleted.');
    }

    private function titleCase(string $value): string
    {
        return mb_convert_case(mb_strtolower(trim($value)), MB_CASE_TITLE, 'UTF-8');
    }
}
