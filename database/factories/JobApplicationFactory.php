<?php

namespace Database\Factories;

use App\Models\JobApplication;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<JobApplication>
 */
class JobApplicationFactory extends Factory
{
    protected $model = JobApplication::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'resume_id' => null,
            'company' => $this->faker->company(),
            'role' => $this->faker->jobTitle(),
            'status' => 'saved',
            'applied_at' => null,
            'follow_up_at' => null,
            'notes' => null,
            'job_url' => $this->faker->url(),
        ];
    }
}
