<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class CoverLetterFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'resume_id' => null,
            'name' => 'My Cover Letter',
            'template_key' => 'standard',
            'body' => 'Dear Hiring Manager, ...',
        ];
    }
}
