<?php

namespace Database\Factories;

use App\Models\ImportedJob;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ImportedJob>
 */
class ImportedJobFactory extends Factory
{
    protected $model = ImportedJob::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'source' => $this->faker->randomElement(['adzuna', 'usajobs']),
            'external_id' => $this->faker->unique()->uuid(),
            'title' => $this->faker->jobTitle(),
            'company' => $this->faker->company(),
            'location' => $this->faker->city(),
            'url' => $this->faker->url(),
            'salary' => '$'.$this->faker->numberBetween(80, 150).'K–$'.$this->faker->numberBetween(151, 220).'K',
            'description' => $this->faker->paragraph(),
            'posted_at' => $this->faker->dateTimeBetween('-2 weeks'),
            'status' => 'Saved',
            'raw' => [],
        ];
    }
}
