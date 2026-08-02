<?php

namespace Database\Factories;

use App\Models\Experience;
use App\Models\Resume;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Experience>
 */
class ExperienceFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'resume_id' => Resume::factory(),
            'position' => 0,
            'title' => $this->faker->jobTitle(),
            'company' => $this->faker->company(),
            'start_date' => $this->faker->year(),
            'end_date' => '',
            'is_current' => true,
            'bullets' => $this->faker->sentences(2),
        ];
    }
}
