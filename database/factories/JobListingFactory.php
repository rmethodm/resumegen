<?php

namespace Database\Factories;

use App\Models\JobListing;
use Illuminate\Database\Eloquent\Factories\Factory;

class JobListingFactory extends Factory
{
    protected $model = JobListing::class;

    public function definition(): array
    {
        return [
            'external_id' => $this->faker->unique()->uuid(),
            'title' => $this->faker->jobTitle(),
            'company' => $this->faker->company(),
            'location' => $this->faker->city(),
            'job_url' => $this->faker->url(),
            'description' => $this->faker->paragraphs(3, true),
        ];
    }
}
