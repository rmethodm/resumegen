<?php

namespace Tests\Feature\Api;

use App\Models\JobApplication;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class JobApplicationApiTest extends ApiTestCase
{
    use RefreshDatabase;

    private function token(User $user): string
    {
        return $user->createToken('test')->plainTextToken;
    }

    public function test_can_list_job_applications(): void
    {
        $user = User::factory()->create();
        $user->jobApplications()->createMany([
            ['company' => 'Acme', 'role' => 'Dev', 'status' => 'applied'],
            ['company' => 'Globex', 'role' => 'Lead', 'status' => 'interviewing'],
        ]);

        $this->withToken($this->token($user))
            ->getJson('/api/jobs')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_can_create_job_application(): void
    {
        $user = User::factory()->create();

        $this->withToken($this->token($user))
            ->postJson('/api/jobs', [
                'company' => 'Initech',
                'role' => 'Engineer',
                'status' => 'applied',
            ])
            ->assertCreated()
            ->assertJsonPath('company', 'Initech');
    }

    public function test_can_show_own_job_application(): void
    {
        $user = User::factory()->create();
        $job = $user->jobApplications()->create([
            'company' => 'Acme', 'role' => 'Dev', 'status' => 'applied',
        ]);

        $this->withToken($this->token($user))
            ->getJson("/api/jobs/{$job->id}")
            ->assertOk()
            ->assertJsonPath('id', $job->id)
            ->assertJsonPath('company', 'Acme');
    }

    public function test_cannot_show_other_users_job_application(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $job = $owner->jobApplications()->create([
            'company' => 'Secret Corp', 'role' => 'Spy', 'status' => 'applied',
        ]);

        $this->withToken($this->token($other))
            ->getJson("/api/jobs/{$job->id}")
            ->assertForbidden();
    }

    public function test_can_update_job_application(): void
    {
        $user = User::factory()->create();
        $job = $user->jobApplications()->create([
            'company' => 'Acme', 'role' => 'Dev', 'status' => 'applied',
        ]);

        $this->withToken($this->token($user))
            ->putJson("/api/jobs/{$job->id}", ['status' => 'interviewing'])
            ->assertOk()
            ->assertJsonPath('status', 'interviewing');
    }

    public function test_can_delete_job_application(): void
    {
        $user = User::factory()->create();
        $job = $user->jobApplications()->create([
            'company' => 'Gone Corp', 'role' => 'Dev', 'status' => 'applied',
        ]);

        $this->withToken($this->token($user))
            ->deleteJson("/api/jobs/{$job->id}")
            ->assertNoContent();

        $this->assertModelMissing($job);
    }

    public function test_cannot_update_other_users_job_application(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $job = $owner->jobApplications()->create([
            'company' => 'Secret', 'role' => 'Spy', 'status' => 'applied',
        ]);

        $this->withToken($this->token($other))
            ->putJson("/api/jobs/{$job->id}", ['status' => 'offered'])
            ->assertForbidden();
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $this->getJson('/api/jobs')->assertUnauthorized();
    }
}
