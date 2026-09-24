<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\ResumeShareLink;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SharesPageTest extends TestCase
{
    use RefreshDatabase;

    /**
     * The page's whole reason to exist is telling the owner who looked. Views count
     * every gated unlock, visitors dedupe by email — collapsing the two would make a
     * single recruiter re-unlocking look like real interest.
     */
    public function test_index_reports_views_and_unique_visitors_per_link(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $link = ResumeShareLink::factory()->for($resume)->create();

        $link->views()->create(['email' => 'a@example.com']);
        $link->views()->create(['email' => 'a@example.com']);
        $link->views()->create(['email' => 'b@example.com']);

        $this->actingAs($user)->get(route('shares.index'))
            ->assertInertia(fn ($page) => $page
                ->component('Shares/Index')
                ->where('links.0.views', 3)
                ->where('links.0.visitors', 2)
            );
    }

    /**
     * resume_share_links.resume_id is unique, so offering a resume that already
     * has a link for create/reassign can only end in a 422. The picker must list
     * only resumes that can still take one.
     */
    public function test_index_offers_only_resumes_without_a_link(): void
    {
        $user = User::factory()->create();
        $linked = Resume::factory()->for($user)->create(['title' => 'Linked']);
        $free = Resume::factory()->for($user)->create(['title' => 'Free']);
        ResumeShareLink::factory()->for($linked)->create();

        $this->actingAs($user)->get(route('shares.index'))
            ->assertInertia(fn ($page) => $page
                ->has('resumes', 1)
                ->where('resumes.0.id', $free->id)
            );
    }

    /**
     * Anonymous visits (no email gate) must stay distinguishable from gated ones
     * in the detail list, and the row carries only fields the schema records.
     */
    public function test_index_lists_recent_visits_with_email_or_null(): void
    {
        $user = User::factory()->create();
        $link = ResumeShareLink::factory()->for(Resume::factory()->for($user)->create())->create();
        $link->views()->create(['email' => null])->forceFill(['created_at' => now()->subMinute()])->save();
        $link->views()->create(['email' => 'a@example.com']);

        $this->actingAs($user)->get(route('shares.index'))
            ->assertInertia(fn ($page) => $page
                ->has('links.0.visits', 2)
                ->where('links.0.visits.0.email', 'a@example.com')
                ->where('links.0.visits.1.email', null)
                ->has('links.0.visits.0.when_exact')
                ->where('links.0.expires_human', 'Never expires')
            );
    }

    /**
     * Counts and the 7-day trend are aggregated in SQL across all links at once;
     * a grouping mistake would bleed one link's traffic into another's sparkline
     * or drop views that fall outside the trend window from the total.
     */
    public function test_index_trend_and_counts_are_per_link_and_per_day(): void
    {
        $this->travelTo(now()->setTime(12, 0));

        $user = User::factory()->create();
        $first = ResumeShareLink::factory()->for(Resume::factory()->for($user)->create())->create();
        $second = ResumeShareLink::factory()->for(Resume::factory()->for($user)->create())->create(['created_at' => now()->subDay()]);

        $at = fn (ResumeShareLink $link, ?string $email, int $daysAgo) => $link->views()->create(['email' => $email])
            ->forceFill(['created_at' => now()->subDays($daysAgo)])->save();

        $at($first, 'a@example.com', 0);
        $at($first, null, 0);
        $at($first, 'a@example.com', 2);
        $at($first, 'b@example.com', 6);
        $at($first, 'c@example.com', 10); // outside the trend window, still counted
        $at($second, null, 1);

        $this->actingAs($user)->get(route('shares.index'))
            ->assertInertia(fn ($page) => $page
                ->where('links.0.id', $first->id)
                ->where('links.0.views', 5)
                ->where('links.0.visitors', 3)
                ->where('links.0.trend', [1, 0, 0, 0, 1, 0, 2])
                ->where('links.1.id', $second->id)
                ->where('links.1.views', 1)
                ->where('links.1.visitors', 0)
                ->where('links.1.trend', [0, 0, 0, 0, 0, 1, 0])
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
            ->assertNotFound();

        $this->assertSame($resume->id, $link->fresh()->resume_id);
    }

    /**
     * 404, not 403: a 403 would confirm the stranger's link exists.
     */
    public function test_a_strangers_link_cannot_be_edited_or_deleted_from_shares(): void
    {
        $stranger = User::factory()->create();
        $resume = Resume::factory()->for($stranger)->create();
        $link = ResumeShareLink::factory()->for($resume)->create();

        $this->actingAs(User::factory()->create())
            ->patch(route('share.update', [$resume, $link]), ['allow_download' => false])
            ->assertNotFound();

        $this->actingAs(User::factory()->create())
            ->delete(route('share.destroy', [$resume, $link]))
            ->assertNotFound();

        $this->assertModelExists($link);
    }

    /**
     * Same password floor as the Workstation share modal — the /shares page
     * must not be a side door to a weaker (4-char) link password.
     */
    public function test_shares_page_rejects_a_short_link_password(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $link = ResumeShareLink::factory()->for($resume)->create();

        $this->actingAs($user)
            ->patch(route('share.update', [$resume, $link]), ['password' => 'abcd'])
            ->assertSessionHasErrors('password');

        $this->assertFalse((bool) $link->fresh()->require_password);
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
     * given — the locked page must carry no resume data at all.
     */
    public function test_a_password_protected_link_withholds_the_resume_until_unlocked(): void
    {
        $resume = Resume::factory()->for(User::factory()->create())->create();
        $link = ResumeShareLink::factory()->for($resume)->create([
            'require_password' => true,
            'password' => 'hunter2',
        ]);

        $this->get(route('share.show', $link->token))
            ->assertInertia(fn ($page) => $page
                ->component('Resumes/PublicShare')
                ->where('locked', true)
                ->where('resume', null)
            );

        $this->post(route('share.unlock', $link->token), ['password' => 'wrong'])
            ->assertSessionHasErrors('password');

        $this->post(route('share.unlock', $link->token), ['password' => 'hunter2'])
            ->assertSessionHasNoErrors();

        $this->get(route('share.show', $link->token))
            ->assertInertia(fn ($page) => $page
                ->where('locked', false)
                ->whereNot('resume', null)
            );
    }

    public function test_password_protected_downloads_are_blocked_while_locked(): void
    {
        $resume = Resume::factory()->for(User::factory()->create())->create();
        $link = ResumeShareLink::factory()->for($resume)->create([
            'require_password' => true,
            'password' => 'hunter2',
        ]);

        $this->get(route('share.pdf', $link->token))->assertForbidden();
    }
}
