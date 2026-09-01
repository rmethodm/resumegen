<?php

namespace Tests\Browser;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTruncation;
use Laravel\Dusk\Browser;
use Tests\DuskTestCase;

/**
 * Skills editor follows skills_layout: flat tags unless Grouped.
 */
class SkillsLayoutAwareTest extends DuskTestCase
{
    use DatabaseTruncation;

    public function test_skills_editor_switches_between_flat_and_grouped(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create([
            'skills_layout' => 'inline',
        ]);

        $resume->skills()->create([
            'category' => 'Frontend',
            'name' => 'React',
            'position' => 0,
        ]);
        $resume->skills()->create([
            'category' => 'Frontend',
            'name' => 'TypeScript',
            'position' => 1,
        ]);

        $this->browse(function (Browser $browser) use ($user, $resume): void {
            $browser->loginAs($user)
                ->visit(route('resumes.workstation', $resume, false))
                ->waitFor('#field-skills', 10)
                ->assertSeeIn('#field-skills', 'skill names only')
                ->assertMissing('#field-skills input[placeholder="Category (e.g. Frontend)"]')
                ->click('#field-skills [role="radio"][title="Grouped"]')
                ->waitFor('#field-skills input[placeholder="Category (e.g. Frontend)"]', 5)
                ->assertSeeIn('#field-skills', 'Category labels print')
                ->assertSeeIn('#field-skills', '+ Add category')
                ->click('#field-skills [role="radio"][title="Inline"]')
                ->waitUntilMissing('#field-skills input[placeholder="Category (e.g. Frontend)"]', 5)
                ->assertSeeIn('#field-skills', 'skill names only');
        });
    }
}
