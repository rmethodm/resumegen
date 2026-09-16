<?php

namespace Tests\Feature;

use App\Models\JobApplication;
use App\Models\JobApplicationInterview;
use App\Models\Resume;
use App\Models\User;
use App\Support\ResumeFillProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class DashboardNextUpTest extends TestCase
{
    use RefreshDatabase;

    /**
     * The `nextUp` prop is deferred, so a normal page visit won't include
     * it. Use Inertia's testing helper to perform the partial reload it
     * generates client-side and pull the resolved prop back out.
     */
    private function nextUp(User $user): array
    {
        $items = null;

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertInertia(function (AssertableInertia $page) use (&$items) {
                $page->reloadOnly('nextUp', function (AssertableInertia $reloaded) use (&$items) {
                    $items = $reloaded->toArray()['props']['nextUp'];
                });
            });

        return $items ?? [];
    }

    public function test_overdue_follow_up_appears(): void
    {
        $user = User::factory()->create();
        // resume_id is set so this card doesn't also match the "unattached"
        // rule — this test isolates the follow-up rule only.
        JobApplication::factory()->for($user)->create([
            'company' => 'Linear', 'role' => 'PM', 'status' => 'applied', 'follow_up_at' => now()->subDay(),
            'resume_id' => Resume::factory()->for($user)->create()->id,
        ]);

        $items = $this->nextUp($user);

        $this->assertCount(1, $items);
        $this->assertSame('follow_up', $items[0]['kind']);
        $this->assertStringContainsString('Linear', $items[0]['label']);
    }

    public function test_future_follow_up_and_closed_cards_do_not_appear(): void
    {
        $user = User::factory()->create();
        // resume_id is set so neither card also matches the "unattached"
        // rule — this test isolates the follow-up date/status rules only.
        $resumeId = Resume::factory()->for($user)->create()->id;
        JobApplication::factory()->for($user)->create(['status' => 'applied', 'follow_up_at' => now()->addDays(3), 'resume_id' => $resumeId]);
        JobApplication::factory()->for($user)->create(['status' => 'rejected', 'follow_up_at' => now()->subDay(), 'resume_id' => $resumeId]);

        $this->assertSame([], $this->nextUp($user));
    }

    public function test_interview_in_next_seven_days_appears(): void
    {
        $user = User::factory()->create();
        $job = JobApplication::factory()->for($user)->create(['status' => 'interviewing', 'resume_id' => Resume::factory()->for($user)->create()->id]);
        JobApplicationInterview::factory()->for($job)->create(['round' => 1, 'scheduled_at' => now()->addDays(2)]);
        JobApplicationInterview::factory()->for($job)->create(['round' => 2, 'scheduled_at' => now()->addDays(20)]);

        $items = $this->nextUp($user);

        $this->assertCount(1, $items);
        $this->assertSame('interview', $items[0]['kind']);
    }

    public function test_card_without_resume_appears_as_unattached(): void
    {
        $user = User::factory()->create();
        JobApplication::factory()->for($user)->create(['status' => 'applied', 'resume_id' => null]);

        $items = $this->nextUp($user);

        $this->assertSame('unattached', $items[0]['kind']);
    }

    public function test_saved_jobs_offer_preparation_with_or_without_a_resume(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        JobApplication::factory()->for($user)->create(['status' => 'saved', 'resume_id' => $resume->id]);
        $withoutResume = JobApplication::factory()->for($user)->create(['status' => 'saved', 'resume_id' => null]);

        $items = $this->nextUp($user);

        $this->assertCount(2, $items);
        $this->assertSame(['prepare', 'prepare'], array_column($items, 'kind'));
        $this->assertContains(route('resumes.workstation', $resume), array_column($items, 'href'));
        $this->assertContains(route('job-applications.index', ['highlight' => $withoutResume->id]), array_column($items, 'href'));
    }

    public function test_interviewing_and_offer_follow_ups_appear_without_duplicate_prompts(): void
    {
        $user = User::factory()->create();
        foreach (['saved', 'interviewing', 'offer'] as $status) {
            JobApplication::factory()->for($user)->create([
                'status' => $status, 'resume_id' => null, 'follow_up_at' => today(),
            ]);
        }

        $items = $this->nextUp($user);

        $this->assertCount(3, $items);
        $this->assertSame(['follow_up', 'follow_up', 'follow_up'], array_column($items, 'kind'));
        $this->assertSame(['Due today', 'Due today', 'Due today'], array_column($items, 'detail'));
    }

    public function test_future_preparation_closed_interviews_and_other_users_jobs_are_excluded(): void
    {
        $user = User::factory()->create();
        JobApplication::factory()->for($user)->create(['status' => 'saved', 'follow_up_at' => today()->addDays(3)]);
        $closed = JobApplication::factory()->for($user)->create(['status' => 'rejected']);
        JobApplicationInterview::factory()->for($closed)->create(['scheduled_at' => now()->addDay()]);
        $foreign = JobApplication::factory()->create(['status' => 'saved', 'follow_up_at' => today()]);
        JobApplicationInterview::factory()->for($foreign)->create(['scheduled_at' => now()->addDay()]);

        $this->assertSame([], $this->nextUp($user));
    }

    public function test_upcoming_interview_takes_priority_over_preparation(): void
    {
        $user = User::factory()->create();
        $job = JobApplication::factory()->for($user)->create(['status' => 'saved']);
        JobApplicationInterview::factory()->for($job)->create(['scheduled_at' => now()->addDay()]);

        $items = $this->nextUp($user);

        $this->assertCount(1, $items);
        $this->assertSame('interview', $items[0]['kind']);
    }

    public function test_dashboard_passes_resume_options_and_wizard_preference(): void
    {
        $user = User::factory()->create(['prefers_apply_wizard' => false]);
        Resume::factory()->for($user)->create(['title' => 'Base']);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page->where('prefersApplyWizard', false));

        $resumeOptions = null;

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertInertia(function (AssertableInertia $page) use (&$resumeOptions) {
                $page->reloadOnly('resumeOptions', function (AssertableInertia $reloaded) use (&$resumeOptions) {
                    $resumeOptions = $reloaded->toArray()['props']['resumeOptions'];
                });
            });

        $this->assertCount(1, $resumeOptions);
        $this->assertSame('Base', $resumeOptions[0]['title']);
    }

    public function test_dashboard_checklist_facts_and_dismissal(): void
    {
        $user = User::factory()->create();
        Resume::factory()->for($user)->create();
        JobApplication::factory()->for($user)->create(['status' => 'applied']);
        $user->createToken(ResumeFillProfile::TOKEN_NAME, [ResumeFillProfile::TOKEN_ABILITY]);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page
                ->where('checklist.dismissed', false)
                ->where('checklist.facts.has_starter_profile', false)
                ->where('checklist.facts.resume_count', 1)
                ->where('checklist.facts.extension_connected', true)
                ->where('checklist.facts.job_count', 1)
                ->where('checklist.facts.applied_count', 1));

        $this->actingAs($user)->patch(route('checklist.dismiss'))->assertRedirect();

        $this->assertNotNull($user->fresh()->dismissed_checklist_at);
        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page->where('checklist.dismissed', true));
    }
}
