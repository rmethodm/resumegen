<?php

namespace Database\Factories;

use App\Models\JobListing;
use App\Models\JobSearch;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<JobListing>
 */
class JobListingFactory extends Factory
{
    public function definition(): array
    {
        return [
            'job_search_id' => JobSearch::factory(),
            'source' => 'adzuna',
            'external_id' => (string) fake()->unique()->randomNumber(8),
            'title' => fake()->jobTitle(),
            'company' => fake()->company(),
            'location' => fake()->city(),
            'url' => fake()->url(),
            'description' => fake()->paragraph(),
        ];
    }
}
