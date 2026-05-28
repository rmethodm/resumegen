<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ResumeFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => $this->faker->name().' Resume',
            'pdf_filename' => $this->faker->uuid().'.pdf',
            'template' => 'classic',
        ];
    }
}
