<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use App\Models\ResumeGroup;
use App\Support\ResumeAnalysis;
use App\Support\ResumeDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class ResumeCompareController extends Controller
{
    /**
     * Side-by-side diff between two versions in a group. Ownership 404s,
     * matching the rest of the app. `left` defaults to the base version
     * (lowest ID — {@see ResumeGroup::resumes()} already orders by id, so
     * it's the collection's first entry); `right` defaults to whichever
     * other version was updated most recently.
     */
    public function show(Request $request, ResumeGroup $resumeGroup): Response
    {
        abort_unless($resumeGroup->user_id === $request->user()->id, 404);

        $versions = $resumeGroup->resumes;

        abort_if($versions->count() < 2, 404);

        $left = $this->resolve($versions, $request->query('left')) ?? $versions->first();

        $right = $this->resolve($versions, $request->query('right'))
            ?? $versions
                ->reject(fn (Resume $version): bool => $version->id === $left->id)
                ->sortByDesc('updated_at')
                ->first();

        return Inertia::render('Resumes/Compare', [
            'group' => ['id' => $resumeGroup->id, 'title' => $resumeGroup->title],
            'versions' => $versions
                ->map(fn (Resume $version): array => ['id' => $version->id, 'title' => $version->title])
                ->all(),
            'left' => $this->side($left),
            'right' => $this->side($right),
        ]);
    }

    /**
     * @param  Collection<int, Resume>  $versions
     */
    private function resolve(Collection $versions, ?string $id): ?Resume
    {
        if ($id === null) {
            return null;
        }

        $resume = $versions->firstWhere('id', (int) $id);

        abort_if($resume === null, 404);

        return $resume;
    }

    /**
     * @return array{id: int, title: string, document: array<string, mixed>, breakdown: list<array{label: string, score: int}>}
     */
    private function side(Resume $resume): array
    {
        return [
            'id' => $resume->id,
            'title' => $resume->title,
            'document' => ResumeDocument::toArray($resume),
            'breakdown' => ResumeAnalysis::breakdown($resume),
        ];
    }
}
