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
        $this->call(LibrarySkillSeeder::class);

        // Test fixture only — never let this account reach a real environment.
        if (! app()->environment('local')) {
            return;
        }

        User::updateOrCreate(
            ['email' => 'rmethodm@outlook.com'],
            [
                'name' => 'Richard Method',
                'password' => Hash::make('up7run2011'),
                'email_verified_at' => now(),
            ]
        );
    }
}
