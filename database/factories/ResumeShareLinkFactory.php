<?php
namespace Database\Factories;

use App\Models\Resume;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class ResumeShareLinkFactory extends Factory
{
    public function definition(): array
    {
        return [
            'resume_id' => Resume::factory(),
            'token'     => Str::random(48),
            'label'     => null,
            'is_active' => true,
        ];
    }
}
