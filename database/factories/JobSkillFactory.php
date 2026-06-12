<?php

namespace Database\Factories;

use App\Models\JobSkill;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<JobSkill>
 */
class JobSkillFactory extends Factory
{
    protected $model = JobSkill::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'category' => $this->faker->randomElement(['Programming', 'Design', 'Marketing', 'User Added']),
            'name' => $this->faker->unique()->jobTitle(),
        ];
    }
}
