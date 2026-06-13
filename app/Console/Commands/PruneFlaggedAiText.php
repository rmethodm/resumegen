<?php

namespace App\Console\Commands;

use App\Models\AiRequest;
use Illuminate\Console\Command;

class PruneFlaggedAiText extends Command
{
    protected $signature = 'ai:prune-flagged {--days=90 : Age in days after which flagged_text is cleared}';

    protected $description = 'Null out stored flagged input text older than the retention window (keeps the metric row).';

    public function handle(): int
    {
        $days = (int) $this->option('days');
        $count = AiRequest::whereNotNull('flagged_text')
            ->where('created_at', '<', now()->subDays($days))
            ->update(['flagged_text' => null]);

        $this->info("Cleared flagged_text on {$count} row(s) older than {$days} days.");

        return self::SUCCESS;
    }
}
