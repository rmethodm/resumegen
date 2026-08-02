<?php

namespace Database\Factories;

use App\Models\StarterProfile;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StarterProfile>
 */
class StarterProfileFactory extends Factory
{
    protected $model = StarterProfile::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'full_name' => $this->faker->name(),
            'headline' => $this->faker->jobTitle(),
            'email' => $this->faker->safeEmail(),
            'phone' => '(555) 123-4567',
            'location' => $this->faker->city(),
            'target_role' => $this->faker->jobTitle(),
            'linkedin' => 'https://linkedin.com/in/'.$this->faker->userName(),
            'website' => 'https://'.$this->faker->domainName(),
            'experience_snapshot' => [],
            'skills' => [],
        ];
    }
}
