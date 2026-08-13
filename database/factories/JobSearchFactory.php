<?php

namespace Database\Factories;

use App\Models\JobSearch;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<JobSearch>
 */
class JobSearchFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'label' => fake()->words(2, true),
            'keywords' => fake()->jobTitle(),
            'location' => fake()->city(),
            'scope' => 'local',
            'is_alerting' => false,
        ];
    }

    public function alerting(): static
    {
        return $this->state(fn (): array => ['is_alerting' => true]);
    }
}
