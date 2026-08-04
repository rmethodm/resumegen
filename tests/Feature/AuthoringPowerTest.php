<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use App\Support\ResumeDocument;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Cluster D authoring power: optional sections, tailor target fields,
 * and the document round-trip those depend on.
 */
class AuthoringPowerTest extends TestCase
{
    use RefreshDatabase;

    public function test_section_order_keeps_hidden_optional_sections_hidden(): void
    {
        $resume = Resume::factory()->create([
            'section_order' => ['contact', 'summary', 'experience', 'skills'],
        ]);

        $this->assertSame(
            ['contact', 'summary', 'experience', 'skills'],
            $resume->sectionOrder(),
        );
        $this->assertNotContains('project', $resume->sectionOrder());
        $this->assertNotContains('education', $resume->sectionOrder());
        $this->assertNotContains('certificate', $resume->sectionOrder());
    }

    public function test_section_order_reinserts_missing_required_sections(): void
    {
        $resume = Resume::factory()->create([
            // Skills omitted on purpose — required, must come back.
            'section_order' => ['contact', 'summary', 'experience', 'project'],
        ]);

        $order = $resume->sectionOrder();

        $this->assertContains('skills', $order);
        $this->assertContains('project', $order);
        $this->assertSame(
            ['contact', 'summary', 'experience', 'project', 'skills'],
            $order,
        );
    }

    public function test_null_section_order_returns_full_catalogue(): void
    {
        $resume = Resume::factory()->create(['section_order' => null]);

        $this->assertSame(Resume::SECTIONS, $resume->sectionOrder());
    }

    public function test_update_persists_optional_section_order_and_target_fields(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $payload = ResumeDocument::toArray($resume);
        unset($payload['id']);
        $payload['section_order'] = ['contact', 'summary', 'experience', 'skills'];
        $payload['target_role'] = 'Staff Engineer';
        $payload['target_company'] = 'Acme Labs';
        $payload['target_job_description'] = "Need React and systems design.\nLead a team of 4.";

        $this->actingAs($user)
            ->put(route('resumes.update', $resume), $payload)
            ->assertRedirect();

        $resume->refresh();

        $this->assertSame(
            ['contact', 'summary', 'experience', 'skills'],
            $resume->sectionOrder(),
        );
        $this->assertSame('Staff Engineer', $resume->target_role);
        $this->assertSame('Acme Labs', $resume->target_company);
        $this->assertStringContainsString('React', $resume->target_job_description);

        $doc = ResumeDocument::toArray($resume);
        $this->assertSame('Acme Labs', $doc['target_company']);
        $this->assertStringContainsString('systems design', $doc['target_job_description']);
        $this->assertSame(
            ['contact', 'summary', 'experience', 'skills'],
            $doc['section_order'],
        );
    }

    public function test_workstation_includes_target_fields_on_resume_prop(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create([
            'target_role' => 'Designer',
            'target_company' => 'Studio X',
            'target_job_description' => 'Figma-heavy role',
        ]);

        $this->actingAs($user)
            ->get(route('resumes.workstation', $resume))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Resumes/Workstation')
                ->where('resume.target_role', 'Designer')
                ->where('resume.target_company', 'Studio X')
                ->where('resume.target_job_description', 'Figma-heavy role')
                ->has('skillLibrary')
            );
    }
}
