<?php

namespace Database\Factories;

use App\Models\ResumeShareLink;
use App\Models\ResumeShareLinkView;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ResumeShareLinkView>
 */
class ResumeShareLinkViewFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'resume_share_link_id' => ResumeShareLink::factory(),
            'email' => $this->faker->safeEmail(),
        ];
    }
}
