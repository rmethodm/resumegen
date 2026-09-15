<?php

namespace Database\Factories;

use App\Models\QaBankEntry;
use App\Models\StarterProfile;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<QaBankEntry>
 */
class QaBankEntryFactory extends Factory
{
    protected $model = QaBankEntry::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'starter_profile_id' => StarterProfile::factory(),
            'question' => $this->faker->sentence().'?',
            'answer' => null,
            'position' => 0,
        ];
    }
}
