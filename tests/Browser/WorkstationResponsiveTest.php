<?php

namespace Tests\Browser;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTruncation;
use Laravel\Dusk\Browser;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\DuskTestCase;

/**
 * Breakpoint coverage for the Workstation specifically — it's the one page
 * with a real per-breakpoint layout fork (two-pane lg:flex-row vs stacked)
 * and the section-reorder drag/button-fallback split fixed alongside this
 * test (see Workstation.tsx's md:hidden reorder buttons).
 */
class WorkstationResponsiveTest extends DuskTestCase
{
    use DatabaseTruncation;

    /**
     * @return array<string, array{0: int, 1: int}>
     */
    public static function breakpoints(): array
    {
        return [
            'mobile (375px, iPhone SE floor)' => [375, 667],
            'tablet (768px, iPad portrait)' => [768, 1024],
            'small desktop (1024px)' => [1024, 800],
            'large desktop (1440px)' => [1440, 900],
        ];
    }

    #[DataProvider('breakpoints')]
    public function test_workstation_has_no_horizontal_overflow(int $width, int $height): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->browse(function (Browser $browser) use ($user, $resume, $width, $height) {
            $browser->loginAs($user)
                ->resize($width, $height)
                ->visit(route('resumes.workstation', $resume))
                ->waitForText($resume->title ?: 'Untitled resume');

            $overflow = $browser->script(
                'return document.documentElement.scrollWidth - document.documentElement.clientWidth'
            )[0];

            $this->assertLessThanOrEqual(
                1, // allow 1px of native scrollbar-gutter rounding
                $overflow,
                "Workstation overflows horizontally by {$overflow}px at {$width}x{$height}."
            );
        });
    }

    /**
     * The drag-disable check (useIsMobile, 768px) and the reorder-button
     * fallback (md:hidden, also 768px) must agree — below 768px the buttons
     * must be visible since dragging is off; at/above 768px they must be
     * hidden since dragging is back on. A mismatch here means there's a
     * width where neither reorder method works at all.
     */
    public function test_reorder_buttons_appear_exactly_where_drag_is_disabled(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->browse(function (Browser $browser) use ($user, $resume) {
            $browser->loginAs($user)
                ->resize(767, 900)
                ->visit(route('resumes.workstation', $resume))
                ->waitForText($resume->title ?: 'Untitled resume')
                ->assertPresent('[aria-label^="Move"][aria-label*="up"]');

            $browser->resize(768, 900)
                ->refresh()
                ->waitForText($resume->title ?: 'Untitled resume')
                ->assertMissing('[aria-label^="Move"][aria-label*="up"]');
        });
    }
}
