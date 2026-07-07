<?php

namespace Database\Factories;

use App\Models\ProofreadingRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProofreadingRequest>
 */
class ProofreadingRequestFactory extends Factory
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
            'resume_id' => null,
            'status' => 'pending',
            'price_cents' => 4900,
            'stripe_checkout_session_id' => null,
            'feedback' => null,
            'completed_at' => null,
        ];
    }
}
