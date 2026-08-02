<?php

namespace Database\Factories;

use App\Models\Education;
use App\Models\Resume;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Education>
 */
class EducationFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'resume_id' => Resume::factory(),
            'position' => 0,
            'school' => $this->faker->company().' University',
            'degree' => 'B.A.',
            'field' => 'Psychology',
            'graduation_year' => (string) $this->faker->year(),
        ];
    }
}
