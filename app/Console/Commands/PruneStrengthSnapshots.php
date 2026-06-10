<?php

namespace App\Console\Commands;

use App\Models\ResumeStrengthSnapshot;
use Illuminate\Console\Command;

class PruneStrengthSnapshots extends Command
{
    protected $signature = 'strength-snapshots:prune';

    protected $description = 'Delete strength snapshots older than 90 days, keeping at least the 60 most recent per resume';

    private const int DAYS_TO_KEEP = 90;

    private const int MIN_RETENTION = 60;

    public function handle(): int
    {
        $resumeIds = ResumeStrengthSnapshot::query()
            ->select('resume_id')
            ->distinct()
            ->pluck('resume_id');

        foreach ($resumeIds as $resumeId) {
            $this->pruneForResume($resumeId);
        }

        return self::SUCCESS;
    }

    private function pruneForResume(int $resumeId): void
    {
        $cutoff = now()->subDays(self::DAYS_TO_KEEP);

        // Count snapshots newer than cutoff (always retained)
        $recentCount = ResumeStrengthSnapshot::query()
            ->where('resume_id', $resumeId)
            ->where('created_at', '>=', $cutoff)
            ->count();

        // How many old snapshots we can keep to satisfy MIN_RETENTION
        $oldSlotsAvailable = max(0, self::MIN_RETENTION - $recentCount);

        // Keep the most recent $oldSlotsAvailable old snapshots, delete the rest
        $idsToKeep = ResumeStrengthSnapshot::query()
            ->where('resume_id', $resumeId)
            ->where('created_at', '<', $cutoff)
            ->orderByDesc('created_at')
            ->limit($oldSlotsAvailable)
            ->pluck('id');

        ResumeStrengthSnapshot::query()
            ->where('resume_id', $resumeId)
            ->where('created_at', '<', $cutoff)
            ->when($idsToKeep->isNotEmpty(), fn ($q) => $q->whereNotIn('id', $idsToKeep))
            ->delete();
    }
}
