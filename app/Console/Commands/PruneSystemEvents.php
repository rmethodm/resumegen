<?php

namespace App\Console\Commands;

use App\Models\SystemEvent;
use Illuminate\Console\Command;

class PruneSystemEvents extends Command
{
    protected $signature = 'system-events:prune {--days=30 : Age in days after which delivery events are deleted}';

    protected $description = 'Delete system delivery events (mail/webhook) older than the retention window.';

    public function handle(): int
    {
        $days = (int) $this->option('days');
        $count = SystemEvent::where('created_at', '<', now()->subDays($days))->delete();

        $this->info("Deleted {$count} system event(s) older than {$days} days.");

        return self::SUCCESS;
    }
}
