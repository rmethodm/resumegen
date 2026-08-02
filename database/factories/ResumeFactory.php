<?php

namespace Database\Factories;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Resume>
 */
class ResumeFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'title' => $this->faker->jobTitle(),
            'full_name' => $this->faker->name(),
            'headline' => $this->faker->jobTitle(),
            'email' => $this->faker->safeEmail(),
            'location' => $this->faker->city().', '.$this->faker->randomElement(['TX', 'CA', 'NY', 'WA', 'IL']),
            'summary' => $this->faker->paragraph(),
        ];
    }

    /**
     * The worked example from the design doc — used to seed a new user's first
     * resume so the builder never opens on an empty page.
     */
    public function sample(): static
    {
        return $this->state(fn (): array => [
            'title' => 'Staff Product Designer — Tech',
            'target_role' => 'Product Design',
            'full_name' => 'Maya Chen',
            'headline' => 'Senior Product Designer',
            'email' => 'maya.chen@email.com',
            'location' => 'Austin, TX',
            'summary' => 'Product designer with 8 years leading 0-to-1 and systems work across fintech and B2B SaaS. Known for pairing design rigor with measurable business impact.',
        ]);
    }
}
