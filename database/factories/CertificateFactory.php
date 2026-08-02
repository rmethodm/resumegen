<?php

namespace Database\Factories;

use App\Models\Certificate;
use App\Models\Resume;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Certificate>
 */
class CertificateFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'resume_id' => Resume::factory(),
            'position' => 0,
            'name' => 'Licensed Clinical Psychologist (IL)',
            'issuer' => 'Illinois IDFPR',
            'obtained_at' => 'Jun 2013',
            'expires_at' => 'Jun 2028',
            'credential_id' => '071.012345',
        ];
    }
}
