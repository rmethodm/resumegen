<?php

namespace App\Support;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

/**
 * A user's resumes loaded with only what {@see ResumeAnalysis::score()} reads,
 * scored once. Shared by the Dashboard, the Kanban, and the Apply wizard so the
 * "pick a resume" lists never re-query or re-score per prop.
 */
final class ScoredResumes
{
    /**
     * Resume columns the score reads, plus the ones list UIs display.
     *
     * @var list<string>
     */
    private const COLUMNS = [
        'id', 'group_id', 'title', 'target_role', 'target_company',
        'full_name', 'headline', 'email', 'location', 'summary', 'updated_at',
    ];

    /**
     * @param  array<array-key, mixed>  $with  extra eager loads for the caller's own display needs
     * @return Collection<int, Resume> newest first
     */
    public static function load(User $user, array $with = []): Collection
    {
        return $user->resumes()
            ->select(self::COLUMNS)
            ->with([
                'experiences:id,resume_id,position,title,company,bullets',
                'skills:id,resume_id,position,name',
                ...$with,
            ])
            ->latest('updated_at')
            ->get();
    }

    /**
     * @param  Collection<int, Resume>  $resumes
     * @return array<int, int> score keyed by resume id
     */
    public static function scores(Collection $resumes): array
    {
        return $resumes
            ->mapWithKeys(fn (Resume $resume): array => [$resume->id => ResumeAnalysis::score($resume)])
            ->all();
    }

    /**
     * @param  Collection<int, Resume>  $resumes
     * @param  array<int, int>|null  $scores  precomputed {@see scores()}, to avoid scoring twice
     * @return list<array{id: int, title: string, score: int}>
     */
    public static function options(Collection $resumes, ?array $scores = null): array
    {
        $scores ??= self::scores($resumes);

        return $resumes
            ->map(fn (Resume $resume): array => [
                'id' => $resume->id,
                'title' => $resume->title,
                'score' => $scores[$resume->id],
            ])
            ->values()
            ->all();
    }
}
