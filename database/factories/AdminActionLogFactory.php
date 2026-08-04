<?php

namespace Database\Factories;

use App\Models\AdminActionLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AdminActionLog>
 */
class AdminActionLogFactory extends Factory
{
    protected $model = AdminActionLog::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'actor_id' => User::factory()->admin(),
            'target_user_id' => User::factory(),
            'action' => 'disable',
            'meta' => null,
            'created_at' => now(),
        ];
    }
}
