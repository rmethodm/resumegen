<?php

namespace Database\Factories;

use App\Models\ApplicationContact;
use App\Models\JobApplication;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ApplicationContact>
 */
class ApplicationContactFactory extends Factory
{
    public function definition(): array
    {
        return [
            'job_application_id' => JobApplication::factory(),
            'user_id' => User::factory(),
            'name' => fake()->name(),
            'role' => fake()->jobTitle(),
            'email' => fake()->safeEmail(),
            'phone' => fake()->phoneNumber(),
            'notes' => null,
        ];
    }
}
