<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use App\Support\ResumeDocument;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WorkstationHeaderTest extends TestCase
{
    use RefreshDatabase;

    public function test_workstation_includes_versions_for_the_header_switcher(): void
    {
        $user = User::factory()->create();
        $first = Resume::factory()->for($user)->create(['title' => 'Base version']);
        $second = Resume::factory()->for($user)->create([
            'title' => 'Targeted version',
            'group_id' => $first->group_id,
        ]);

        $this->actingAs($user)
            ->get(route('resumes.workstation', $second))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Resumes/Workstation')
                ->has('versions', 2)
                ->where('versions.0.id', $first->id)
                ->where('versions.0.is_current', false)
                ->where('versions.1.id', $second->id)
                ->where('versions.1.is_current', true)
                ->has('share')
                ->has('resume')
            );
    }

    public function test_workstation_includes_analysis_breakdown_and_suggestions(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->get(route('resumes.workstation', $resume))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Resumes/Workstation')
                ->has('analysis.score')
                ->has('analysis.suggestions')
                ->has('analysis.breakdown', 4)
                ->where('analysis.breakdown.0.label', 'Profile')
                ->where('analysis.breakdown.1.label', 'Experience')
                ->where('analysis.breakdown.2.label', 'Impact')
                ->where('analysis.breakdown.3.label', 'Keywords')
            );
    }

    public function test_workstation_404s_for_another_users_resume(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $resume = Resume::factory()->for($other)->create();

        $this->actingAs($user)
            ->get(route('resumes.workstation', $resume))
            ->assertNotFound();
    }

    public function test_update_persists_font_and_density_from_format_toolbar(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create([
            'font' => 'inter',
            'density' => 'balanced',
        ]);

        $payload = ResumeDocument::toArray($resume);
        unset($payload['id']);
        $payload['font'] = 'georgia';
        $payload['density'] = 'compact';

        $this->actingAs($user)
            ->put(route('resumes.update', $resume), $payload)
            ->assertRedirect();

        $resume->refresh();

        $this->assertSame('georgia', $resume->font);
        $this->assertSame('compact', $resume->density);
    }

    public function test_update_persists_bullet_style_and_skills_layout_from_format_toolbar(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create([
            'bullet_style' => 'bullet',
            'skills_layout' => 'inline',
        ]);

        $payload = ResumeDocument::toArray($resume);
        unset($payload['id']);
        $payload['bullet_style'] = 'numbered';
        $payload['skills_layout'] = 'grouped';

        $this->actingAs($user)
            ->put(route('resumes.update', $resume), $payload)
            ->assertRedirect();

        $resume->refresh();

        $this->assertSame('numbered', $resume->bullet_style);
        $this->assertSame('grouped', $resume->skills_layout);
    }
}
