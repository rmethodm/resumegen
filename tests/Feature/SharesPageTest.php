<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\ResumeShareEvent;
use App\Models\ResumeShareLink;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SharesPageTest extends TestCase
{
    use RefreshDatabase;

    private function logView(ResumeShareLink $link, string $ipHash, ?string $at = null): ResumeShareEvent
    {
        return ResumeShareEvent::forceCreate([
            'resume_share_link_id' => $link->id,
            'resume_id' => $link->resume_id,
            'event' => 'page_view',
            'ip_hash' => $ipHash,
            'created_at' => $at ?? now(),
        ]);
    }

    /**
     * The page's whole reason to exist is telling the owner who looked. Views count
     * every hit, visitors dedupes by IP — collapsing the two would make a single
     * recruiter refreshing look like real interest.
     */
    public function test_index_reports_views_and_unique_visitors_per_link(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $link = ResumeShareLink::factory()->for($resume)->create();

        $this->logView($link, 'ip-a');
        $this->logView($link, 'ip-a');
        $this->logView($link, 'ip-b');

        $this->actingAs($user)->get(route('shares.index'))
            ->assertInertia(fn ($page) => $page
                ->component('Shares/Index')
                ->where('links.0.views', 3)
                ->where('links.0.visitors', 2)
            );
    }

    public function test_index_excludes_other_users_links(): void
    {
        $user = User::factory()->create();
        $stranger = User::factory()->create();
        ResumeShareLink::factory()->for(Resume::factory()->for($stranger)->create())->create();

        $this->actingAs($user)->get(route('shares.index'))
            ->assertInertia(fn ($page) => $page->has('links', 0));
    }

    /**
     * Unread is "views since I last looked at this link's detail", so opening the
     * detail must reset it. If it never reset, the badge would be a permanent
     * view counter and stop meaning "something new happened".
     */
    public function test_marking_a_link_seen_clears_its_unread_count(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $link = ResumeShareLink::factory()->for($resume)->create();
        $this->logView($link, 'ip-a', now()->subHour());

        $this->actingAs($user)->get(route('shares.index'))
            ->assertInertia(fn ($page) => $page->where('links.0.unread', 1));

        $this->actingAs($user)
            ->patch(route('share.update', [$resume, $link]), ['seen' => true])
            ->assertRedirect();

        $this->actingAs($user)->get(route('shares.index'))
            ->assertInertia(fn ($page) => $page->where('links.0.unread', 0));
    }

    /**
     * "Primary" is the one link the user hands out by default — two primaries
     * would make the label meaningless, so promoting one must demote the rest.
     */
    public function test_promoting_a_link_to_primary_demotes_the_previous_one(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $old = ResumeShareLink::factory()->for($resume)->create(['is_primary' => true]);
        $new = ResumeShareLink::factory()->for($resume)->create();

        $this->actingAs($user)
            ->patch(route('share.update', [$resume, $new]), ['is_primary' => true])
            ->assertRedirect();

        $this->assertFalse($old->fresh()->is_primary);
        $this->assertTrue($new->fresh()->is_primary);
    }

    /**
     * Reassigning a link changes what a URL already in someone's inbox serves.
     * Without the ownership check it would be a way to publish another user's resume.
     */
    public function test_a_link_cannot_be_reassigned_to_someone_elses_resume(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $link = ResumeShareLink::factory()->for($resume)->create();
        $strangersResume = Resume::factory()->for(User::factory()->create())->create();

        $this->actingAs($user)
            ->patch(route('share.update', [$resume, $link]), ['resume_id' => $strangersResume->id])
            ->assertForbidden();

        $this->assertSame($resume->id, $link->fresh()->resume_id);
    }

    public function test_a_link_can_be_reassigned_to_another_owned_resume(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $other = Resume::factory()->for($user)->create();
        $link = ResumeShareLink::factory()->for($resume)->create();

        $this->actingAs($user)
            ->patch(route('share.update', [$resume, $link]), ['resume_id' => $other->id])
            ->assertRedirect();

        $this->assertSame($other->id, $link->fresh()->resume_id);
    }

    /**
     * A password is only protection if the resume is genuinely withheld until it is
     * given — and the view must not be logged, or the owner sees phantom visitors.
     */
    public function test_a_password_protected_link_withholds_the_resume_until_unlocked(): void
    {
        $resume = Resume::factory()->for(User::factory()->create())->create();
        $link = ResumeShareLink::factory()->for($resume)->create(['password_hash' => Hash::make('hunter2')]);

        $this->get(route('public.resume', $link->token))
            ->assertInertia(fn ($page) => $page->component('ResumeBuilder/LinkPassword'));

        $this->assertDatabaseCount('resume_share_events', 0);

        $this->post(route('public.resume.unlock', $link->token), ['password' => 'wrong'])
            ->assertSessionHasErrors('password');

        $this->post(route('public.resume.unlock', $link->token), ['password' => 'hunter2'])
            ->assertRedirect(route('public.resume', $link->token));

        $this->get(route('public.resume', $link->token))
            ->assertInertia(fn ($page) => $page->component('ResumeBuilder/PublicView'));
    }

    public function test_password_protected_downloads_are_blocked_while_locked(): void
    {
        $resume = Resume::factory()->for(User::factory()->create())->create();
        $link = ResumeShareLink::factory()->for($resume)->create(['password_hash' => Hash::make('hunter2')]);

        $this->get(route('public.pdf', $link->token))->assertForbidden();
    }
}
