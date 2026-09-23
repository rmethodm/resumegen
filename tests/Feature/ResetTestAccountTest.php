<?php

namespace Tests\Feature;

use App\Actions\ResetTestAccount;
use App\Models\JobListing;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ResetTestAccountTest extends TestCase
{
    use RefreshDatabase;

    /**
     * The reset exists so the test account behaves like a brand-new signup:
     * every other row is gone, settings are back to defaults, but the account
     * can still log in with the same credentials.
     */
    public function test_reset_leaves_only_a_fresh_copy_of_the_kept_account(): void
    {
        $kept = User::factory()->create([
            'email' => 'keep@example.com',
            'has_completed_onboarding' => true,
            'target_role' => 'Captain',
            'preferred_template' => 'modern',
            'prefers_apply_wizard' => false,
            'dismissed_checklist_at' => now(),
            'profile' => ['phone' => '555-0100'],
        ]);
        $passwordHash = $kept->password;
        $other = User::factory()->create();

        Resume::factory()->for($kept)->create();
        Resume::factory()->for($other)->create();
        DB::table('starter_profiles')->insert(['user_id' => $kept->id, 'full_name' => 'Jean-Luc Picard', 'email' => 'keep@example.com']);
        JobListing::create(['external_id' => 'real-1', 'title' => 'Real job', 'company' => 'Acme', 'location' => 'Earth', 'job_url' => 'https://acme.test/1', 'description' => 'Real']);

        app(ResetTestAccount::class)->handle('keep@example.com');

        $this->assertSame([$kept->id], User::pluck('id')->all());
        $kept->refresh();
        $this->assertSame('keep@example.com', $kept->email);
        $this->assertSame($passwordHash, $kept->password);
        $this->assertNotNull($kept->email_verified_at);
        $this->assertFalse($kept->has_completed_onboarding);
        $this->assertNull($kept->target_role);
        $this->assertNull($kept->preferred_template);
        $this->assertNull($kept->profile);
        $this->assertTrue($kept->prefers_apply_wizard);
        $this->assertNull($kept->dismissed_checklist_at);

        $this->assertSame(0, Resume::count());
        $this->assertSame(0, DB::table('starter_profiles')->count());

        $this->assertSame(50, JobListing::count());
        $this->assertSame(0, JobListing::where('external_id', 'real-1')->count());

        $this->assertGreaterThan(0, DB::table('job_roles')->count());
        $this->assertGreaterThan(0, DB::table('job_skills')->count());
        $this->assertGreaterThan(0, DB::table('library_skills')->count());
    }

    public function test_reset_route_is_not_registered_outside_local(): void
    {
        $user = User::factory()->create();

        $this->get('/reset')->assertNotFound();
        $this->assertModelExists($user);
    }
}
