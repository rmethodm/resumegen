<?php

namespace Database\Factories;

use App\Models\Resume;
use App\Models\ResumeNote;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ResumeNote>
 */
class ResumeNoteFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'resume_id' => Resume::factory(),
            'body' => $this->faker->sentence(),
            'x' => $this->faker->numberBetween(0, 600),
            'y' => $this->faker->numberBetween(0, 800),
        ];
    }
}
