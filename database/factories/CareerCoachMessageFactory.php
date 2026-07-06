<?php

namespace Database\Factories;

use App\Models\CareerCoachMessage;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CareerCoachMessage>
 */
class CareerCoachMessageFactory extends Factory
{
    protected $model = CareerCoachMessage::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'role' => 'user',
            'content' => $this->faker->sentence(),
        ];
    }
}
