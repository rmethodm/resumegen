<?php

namespace Tests\Browser;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTruncation;
use Laravel\Dusk\Browser;
use Tests\DuskTestCase;

/**
 * Smoke coverage for the builder — the one layer that actually executes React.
 *
 * The feature suite asserts the props Laravel sends; it stays green even if the
 * page throws on mount. These tests exist to catch exactly that.
 *
 * Runs against the resumegen_dusk database (see .env.dusk.local), never the dev one.
 *
 * DatabaseTruncation, not DatabaseMigrations: this project's migrations are
 * forward-only (CLAUDE.md), and DatabaseMigrations rolls back on teardown, which
 * dies in the first down() that drops an already-dropped constraint. Truncation
 * never rolls back, so run `php artisan migrate --env=dusk.local` after adding a
 * migration.
 */
class ResumeBuilderTest extends DuskTestCase
{
    use DatabaseTruncation;

    public function test_builder_renders_without_javascript_errors(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create(['name' => 'Dusk Smoke Resume']);

        $this->browse(function (Browser $browser) use ($user, $resume): void {
            $browser->loginAs($user)
                ->visit(route('builder.edit', $resume, false))
                ->waitFor('input[name="target_company"]', 10)
                ->assertPresent('input[name="target_title"]');

            $severe = collect($browser->driver->manage()->getLog('browser'))
                ->filter(fn (array $entry): bool => $entry['level'] === 'SEVERE')
                ->pluck('message')
                ->all();

            $this->assertSame([], $severe, "Console errors on the builder:\n".implode("\n", $severe));
        });
    }

    /**
     * The builder saves on blur, not on submit. This is the round trip that makes
     * job pairings possible at all — if the target never persists, every AI call
     * falls into __general__ and the §12 numbers stay empty.
     */
    public function test_target_job_fields_persist_on_blur(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create([
            'target_company' => null,
            'target_title' => null,
        ]);

        $this->browse(function (Browser $browser) use ($user, $resume): void {
            $browser->loginAs($user)
                ->visit(route('builder.edit', $resume, false))
                ->waitFor('input[name="target_company"]', 10)
                ->type('target_company', 'Acme, Inc.')
                ->type('target_title', 'Senior Product Manager')
                // The builder saves on blur; blur the focused field directly rather
                // than clicking a neutral element, which Dusk's resolver will not match.
                ->script('document.activeElement.blur()');

            $browser->pause(2000);
        });

        $resume->refresh();

        $this->assertSame('Acme, Inc.', $resume->target_company);
        $this->assertSame('Senior Product Manager', $resume->target_title);
    }

    /** A resume belonging to someone else must not be reachable. */
    public function test_builder_is_closed_to_other_users(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $resume = Resume::factory()->for($owner)->create();

        $this->browse(function (Browser $browser) use ($intruder, $resume): void {
            $browser->loginAs($intruder)
                ->visit(route('builder.edit', $resume, false))
                // assertMissing on the control itself, not assertDontSee on a string —
                // a "don't see" assertion passes on any error page and proves nothing.
                ->assertMissing('input[name="target_company"]');
        });
    }
}
