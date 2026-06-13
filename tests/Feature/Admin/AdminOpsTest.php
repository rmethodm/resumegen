<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class AdminOpsTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['is_master_admin' => true]);
    }

    private function seedFailedJob(string $uuid = 'uuid-1'): void
    {
        DB::table('failed_jobs')->insert([
            'uuid' => $uuid,
            'connection' => 'database',
            'queue' => 'default',
            'payload' => json_encode(['uuid' => $uuid, 'displayName' => 'App\\Jobs\\SendEmail', 'job' => 'x', 'data' => []]),
            'exception' => "RuntimeException: boom\nstack line two",
            'failed_at' => now(),
        ]);
    }

    public function test_index_renders_with_health_and_queue(): void
    {
        $this->seedFailedJob();

        $this->actingAs($this->admin())->get(route('admin.ops.index'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Admin/Ops/Index')
                ->has('queue.pending')
                ->where('queue.failed', 1)
                ->has('failedJobs', 1)
                ->where('failedJobs.0.job', 'App\\Jobs\\SendEmail')
                ->has('schedule')
                ->has('health')
            );
    }

    public function test_health_includes_stripe_secret_check(): void
    {
        $this->actingAs($this->admin())->get(route('admin.ops.index'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('health', fn ($health) => collect($health)->contains(fn ($h) => $h['key'] === 'Stripe secret'))
            );
    }

    public function test_forget_failed_deletes_and_audits(): void
    {
        $this->seedFailedJob('uuid-forget');

        $this->actingAs($this->admin())->delete(route('admin.ops.forget', 'uuid-forget'))
            ->assertRedirect();

        $this->assertDatabaseMissing('failed_jobs', ['uuid' => 'uuid-forget']);
        $this->assertDatabaseHas('admin_audit_logs', ['action' => 'ops.job.forget']);
    }

    public function test_retry_failed_requeues_and_audits(): void
    {
        $this->seedFailedJob('uuid-retry');

        $this->actingAs($this->admin())->post(route('admin.ops.retry', 'uuid-retry'))
            ->assertRedirect();

        $this->assertDatabaseMissing('failed_jobs', ['uuid' => 'uuid-retry']);
        $this->assertDatabaseHas('admin_audit_logs', ['action' => 'ops.job.retry']);
    }

    public function test_non_admin_forbidden(): void
    {
        $user = User::factory()->create(['is_master_admin' => false]);

        $this->actingAs($user)->get(route('admin.ops.index'))->assertForbidden();
        $this->actingAs($user)->delete(route('admin.ops.forget', 'x'))->assertForbidden();
    }
}
