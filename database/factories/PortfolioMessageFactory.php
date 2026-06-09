<?php

namespace Database\Factories;

use App\Models\PortfolioMessage;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PortfolioMessage>
 */
class PortfolioMessageFactory extends Factory
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
            'sender_name' => fake()->name(),
            'sender_email' => fake()->safeEmail(),
            'message' => fake()->paragraph(),
            'read_at' => null,
        ];
    }
}
