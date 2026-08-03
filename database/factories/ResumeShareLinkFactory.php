<?php

namespace Database\Factories;

use App\Models\Resume;
use App\Models\ResumeShareLink;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ResumeShareLink>
 */
class ResumeShareLinkFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'resume_id' => Resume::factory(),
            'allow_download' => true,
            'require_email' => false,
        ];
    }
}
