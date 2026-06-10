<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SkillsLayoutTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Resume $resume;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
        $this->resume = Resume::factory()->for($this->user)->create([
            'skills' => ['PHP', 'React', 'Laravel'],
            'skills_layout' => 'inline',
            'skills_groups' => null,
        ]);
    }

    public function test_skills_layout_is_saved(): void
    {
        $this->actingAs($this->user)
            ->put(route('builder.update', $this->resume), [
                'skills_layout' => 'bullets',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('resumes', [
            'id' => $this->resume->id,
            'skills_layout' => 'bullets',
        ]);
    }

    public function test_invalid_skills_layout_is_rejected(): void
    {
        $this->actingAs($this->user)
            ->put(route('builder.update', $this->resume), [
                'skills_layout' => 'invalid-value',
            ])
            ->assertSessionHasErrors('skills_layout');
    }

    public function test_skills_groups_are_saved(): void
    {
        $groups = [
            ['category' => 'Frontend', 'items' => ['React', 'TypeScript']],
            ['category' => 'Backend', 'items' => ['Laravel', 'PHP']],
        ];

        $this->actingAs($this->user)
            ->put(route('builder.update', $this->resume), [
                'skills_layout' => 'grouped',
                'skills_groups' => $groups,
            ])
            ->assertRedirect();

        $this->resume->refresh();
        $this->assertEquals('grouped', $this->resume->skills_layout);
        $this->assertCount(2, $this->resume->skills_groups);
        $this->assertEquals('Frontend', $this->resume->skills_groups[0]['category']);
    }

    public function test_skills_layout_and_groups_are_copied_with_resume(): void
    {
        $this->resume->update([
            'skills_layout' => 'grouped',
            'skills_groups' => [['category' => 'Tools', 'items' => ['Docker']]],
        ]);

        $this->actingAs($this->user)
            ->post(route('builder.duplicate', $this->resume))
            ->assertRedirect();

        $copy = Resume::where('user_id', $this->user->id)
            ->where('id', '!=', $this->resume->id)
            ->latest()
            ->first();

        $this->assertEquals('grouped', $copy->skills_layout);
        $this->assertEquals('Tools', $copy->skills_groups[0]['category']);
    }

    public function test_pdf_renders_bullets_layout(): void
    {
        $this->resume->update(['skills_layout' => 'bullets']);

        $response = $this->actingAs($this->user)
            ->get(route('builder.pdf', $this->resume));

        $response->assertStatus(200);
        $response->assertHeader('content-type', 'application/pdf');
    }

    public function test_pdf_renders_grouped_layout(): void
    {
        $this->resume->update([
            'skills_layout' => 'grouped',
            'skills_groups' => [
                ['category' => 'Frontend', 'items' => ['React']],
            ],
        ]);

        $response = $this->actingAs($this->user)
            ->get(route('builder.pdf', $this->resume));

        $response->assertStatus(200);
        $response->assertHeader('content-type', 'application/pdf');
    }
}
