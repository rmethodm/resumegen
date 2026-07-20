<?php

namespace Database\Factories;

use App\Models\AiRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AiRequest>
 */
class AiRequestFactory extends Factory
{
    protected $model = AiRequest::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'feature' => null,
            'model' => 'gpt-4o-mini',
            'prompt_tokens' => 10,
            'completion_tokens' => 5,
            'total_tokens' => 15,
            'estimated_cost_micro_cents' => 0,
            'status' => 'success',
        ];
    }
}
