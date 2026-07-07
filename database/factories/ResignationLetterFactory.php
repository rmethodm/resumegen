<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ResignationLetterFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'resume_id' => null,
            'name' => 'My Resignation Letter',
            'template_key' => 'standard',
            'body' => 'Dear Manager, ...',
        ];
    }
}
