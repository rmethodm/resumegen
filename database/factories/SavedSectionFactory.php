<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class SavedSectionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => fake()->words(2, true),
            'type' => fake()->randomElement(['experience', 'education', 'skills', 'custom']),
            'fields' => [
                ['id' => 'title', 'type' => 'text', 'label' => 'Title'],
                ['id' => 'body', 'type' => 'textarea', 'label' => 'Description'],
            ],
        ];
    }
}
