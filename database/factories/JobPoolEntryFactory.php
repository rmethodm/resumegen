<?php

namespace Database\Factories;

use App\Models\JobListing;
use App\Models\JobPoolEntry;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class JobPoolEntryFactory extends Factory
{
    protected $model = JobPoolEntry::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'job_listing_id' => JobListing::factory(),
            'resume_id' => Resume::factory(),
        ];
    }
}
