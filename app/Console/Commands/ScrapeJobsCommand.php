<?php

namespace App\Console\Commands;

use App\Services\JobImport\JobScrapePool;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('jobs:scrape-import')]
#[Description('Fetch listings from configured Greenhouse/Lever boards and career pages into the scraped job pool')]
class ScrapeJobsCommand extends Command
{
    public function handle(JobScrapePool $pool): int
    {
        $pool->refresh();

        return self::SUCCESS;
    }
}
