<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

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
        $this->call(JobSkillsSeeder::class);

        // Test fixtures only — never let sample resumes reach a real environment.
        if (! app()->environment('local')) {
            return;
        }

        // Created up front so the fixture seeders below (each of which firstOrCreate's
        // this same address) attach their resumes here and never reset the password.
        User::updateOrCreate(
            ['email' => 'rmethodm@outlook.com'],
            [
                'name' => 'Richard Method',
                'password' => Hash::make('up7run2011'),
                'email_verified_at' => now(),
            ]
        );

        $this->call(ScifiCharacterResumeSeeder::class);
        $this->call(SampleSharesSeeder::class);
        $this->call(TestAnalyticsDataSeeder::class);
    }
}
