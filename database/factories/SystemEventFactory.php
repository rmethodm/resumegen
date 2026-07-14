<?php

namespace Database\Factories;

use App\Models\SystemEvent;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SystemEvent>
 */
class SystemEventFactory extends Factory
{
    public function definition(): array
    {
        return [
            'channel' => 'mail',
            'type' => $this->faker->randomElement(['Welcome email', 'invoice.paid', 'customer.subscription.updated']),
            'status' => $this->faker->randomElement(['sent', 'received']),
            'recipient' => $this->faker->optional()->safeEmail(),
            'meta' => null,
        ];
    }
}
