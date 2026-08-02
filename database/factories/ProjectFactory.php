<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\Resume;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Project>
 */
class ProjectFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'resume_id' => Resume::factory(),
            'position' => 0,
            'name' => $this->faker->words(3, true),
            'url' => $this->faker->url(),
            'start_date' => 'Jan 2023',
            'end_date' => 'Dec 2023',
            'description' => $this->faker->sentence(),
            'highlights' => $this->faker->sentences(2),
        ];
    }
}
