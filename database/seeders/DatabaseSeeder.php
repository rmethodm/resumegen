<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(JobRolesSeeder::class);
        $this->call(JobTitlesSeeder::class);

        // Test fixtures only — never let sample resumes reach a real environment.
        if (app()->environment('local')) {
            $this->call(SampleSharesSeeder::class);
        }
    }
}
