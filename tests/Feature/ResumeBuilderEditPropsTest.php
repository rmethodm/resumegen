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

    public function test_pdf_blade_renders_watermark_when_flagged(): void
    {
        $resume = Resume::factory()->create();

        $html = view('resume-pdf', ['resume' => $resume, 'watermark' => true])->render();

        $this->assertStringContainsString('Made with Resumegen', $html);
    }

    public function test_pdf_blade_omits_watermark_by_default(): void
    {
        $resume = Resume::factory()->create();

        $html = view('resume-pdf', ['resume' => $resume])->render();

        $this->assertStringNotContainsString('Made with Resumegen', $html);
    }
}
