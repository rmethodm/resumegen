<?php

namespace Database\Factories;

use App\Models\AdminAuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AdminAuditLog>
 */
class AdminAuditLogFactory extends Factory
{
    public function definition(): array
    {
        return [
            'admin_user_id' => User::factory(),
            'action' => $this->faker->randomElement(['user.delete', 'user.toggle-pro', 'ai.block']),
            'target_type' => null,
            'target_id' => null,
            'description' => $this->faker->sentence(),
            'meta' => null,
            'ip_address' => $this->faker->ipv4(),
        ];
    }
}
