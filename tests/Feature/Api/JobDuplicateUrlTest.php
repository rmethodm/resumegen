<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class JobDuplicateUrlTest extends ApiTestCase
{
    use RefreshDatabase;

    public function test_duplicate_job_url_returns_409(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;
        $data = [
            'company' => 'Acme',
            'role' => 'Engineer',
            'status' => 'saved',
            'job_url' => 'https://example.com/jobs/123',
        ];
        $this->withToken($token)->postJson('/api/jobs', $data)->assertStatus(201);
        $this->withToken($token)->postJson('/api/jobs', $data)->assertStatus(409);
    }

    public function test_same_url_by_different_user_does_not_conflict(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        $token1 = $user1->createToken('test')->plainTextToken;
        $token2 = $user2->createToken('test')->plainTextToken;
        $data = [
            'company' => 'Acme',
            'role' => 'Engineer',
            'status' => 'saved',
            'job_url' => 'https://example.com/jobs/123',
        ];
        $this->withToken($token1)->postJson('/api/jobs', $data)->assertStatus(201);
        $this->withToken($token2)->postJson('/api/jobs', $data)->assertStatus(201);
    }

    public function test_jobs_without_url_do_not_conflict(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;
        $data = ['company' => 'Acme', 'role' => 'Engineer', 'status' => 'saved'];
        $this->withToken($token)->postJson('/api/jobs', $data)->assertStatus(201);
        $this->withToken($token)->postJson('/api/jobs', $data)->assertStatus(201);
    }
}
