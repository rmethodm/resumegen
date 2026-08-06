<?php

namespace Database\Factories;

use App\Models\ScrapedJob;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ScrapedJob>
 */
class ScrapedJobFactory extends Factory
{
    protected $model = ScrapedJob::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'source' => $this->faker->randomElement(['greenhouse', 'lever', 'career_page']),
            'external_id' => $this->faker->unique()->uuid(),
            'title' => $this->faker->jobTitle(),
            'company' => $this->faker->company(),
            'location' => $this->faker->city(),
            'url' => $this->faker->url(),
            'salary' => null,
            'description' => $this->faker->paragraph(),
            'posted_at' => $this->faker->dateTimeBetween('-2 weeks'),
            'raw' => [],
        ];
    }
}
