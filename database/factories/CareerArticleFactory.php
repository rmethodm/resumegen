<?php

namespace Database\Factories;

use App\Models\CareerArticle;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CareerArticle>
 */
class CareerArticleFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => rtrim(fake()->sentence(6), '.'),
            'slug' => '',
            'body' => '<p>'.implode('</p><p>', fake()->paragraphs(3)).'</p>',
            'category' => fake()->randomElement(CareerArticle::CATEGORIES),
            'meta_description' => fake()->sentence(),
            'reading_time_minutes' => fake()->numberBetween(2, 15),
            'is_published' => false,
            'published_at' => null,
        ];
    }

    public function published(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_published' => true,
            'published_at' => now(),
        ]);
    }

    public function draft(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_published' => false,
            'published_at' => null,
        ]);
    }
}
