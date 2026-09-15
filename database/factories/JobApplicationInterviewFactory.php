<?php

namespace Database\Factories;

use App\Models\JobApplication;
use App\Models\JobApplicationInterview;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<JobApplicationInterview>
 */
class JobApplicationInterviewFactory extends Factory
{
    protected $model = JobApplicationInterview::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'job_application_id' => JobApplication::factory(),
            'round' => 1,
            'scheduled_at' => null,
            'type' => 'phone',
            'notes' => null,
        ];
    }
}
