<?php

namespace Database\Factories;

use App\Models\JobApplication;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class JobApplicationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'company' => $this->faker->company(),
            'role'    => $this->faker->jobTitle(),
            'status'  => $this->faker->randomElement(JobApplication::STATUSES),
        ];
    }
}
