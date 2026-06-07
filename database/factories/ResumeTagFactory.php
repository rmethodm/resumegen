<?php

namespace Database\Factories;

use App\Models\Resume;
use App\Models\ResumeTag;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ResumeTag>
 */
class ResumeTagFactory extends Factory
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
            'label' => fake()->word(),
            'color' => '#6366f1',
        ];
    }
}
