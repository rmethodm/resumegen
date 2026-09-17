<?php

namespace App\Console\Commands\Jobs;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

#[Signature('app:import-job-listings {path : Path to the JSONL file to import}')]
#[Description('Import job listings from a JSONL file (one JSON object per line) into the job_listings table')]
class ImportJobListings extends Command
{
    public function handle(): int
    {
        $path = $this->argument('path');

        if (! is_file($path)) {
            $this->error("File not found: {$path}");

            return self::FAILURE;
        }

        $columns = ['external_id', 'title', 'company', 'location', 'job_url', 'description'];

        $handle = fopen($path, 'r');
        $chunk = [];
        $total = 0;
        $chunkSize = 500;

        $this->output->progressStart();

        while (($line = fgets($handle)) !== false) {
            $line = trim($line);
            if ($line === '') {
                continue;
            }

            $row = json_decode($line, true, flags: JSON_THROW_ON_ERROR);
            $now = now();
            $chunk[] = [
                ...array_intersect_key($row, array_flip($columns)),
                'created_at' => $now,
                'updated_at' => $now,
            ];

            if (count($chunk) >= $chunkSize) {
                DB::table('job_listings')->upsert($chunk, ['external_id'], $columns);
                $total += count($chunk);
                $chunk = [];
                $this->output->progressAdvance($chunkSize);
            }
        }

        if ($chunk !== []) {
            DB::table('job_listings')->upsert($chunk, ['external_id'], $columns);
            $total += count($chunk);
        }

        fclose($handle);
        $this->output->progressFinish();

        $this->info("Imported {$total} job listings.");

        return self::SUCCESS;
    }
}
