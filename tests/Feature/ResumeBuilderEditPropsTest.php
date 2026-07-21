<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResumeBuilderEditPropsTest extends TestCase
{
    use RefreshDatabase;

    public function test_edit_passes_skill_category_options(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->get(route('builder.edit', $resume))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('skillCategoryOptions', 12)
                ->where('skillCategoryOptions.1', 'Web & Mobile')
            );
    }

    /**
     * The PDF watermark was a paid-tier gate; it went with billing and the template
     * can no longer render one at all. This is an alarm, not a behaviour test — like
     * the assertSessionMissing('featureGate') assertions elsewhere in the suite, it
     * fails if a paywall artifact creeps back into the export path.
     *
     * Replaced test_pdf_blade_renders_watermark_when_flagged, which asserted the
     * now-deleted $watermark => true branch.
     */
    public function test_pdf_blade_never_renders_a_watermark(): void
    {
        $resume = Resume::factory()->create();

        $html = view('resume-pdf', ['resume' => $resume])->render();

        $this->assertStringNotContainsString('Made with Resumegen', $html);
    }
}
