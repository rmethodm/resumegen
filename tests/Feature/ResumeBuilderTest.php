<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResumeBuilderTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_save_minimal_ruled_template(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'Test', 'pdf_filename' => 'test.pdf']);

        $response = $this->actingAs($user)->put(route('builder.update', $resume->id), [
            'name' => 'Test',
            'template' => 'minimal-ruled',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('resumes', ['id' => $resume->id, 'template' => 'minimal-ruled']);
    }

    public function test_invalid_template_is_rejected(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'Test', 'pdf_filename' => 'test.pdf']);

        $response = $this->actingAs($user)->put(route('builder.update', $resume->id), [
            'name' => 'Test',
            'template' => 'not-a-real-template',
        ]);

        $response->assertSessionHasErrors('template');
    }

    public function test_user_can_duplicate_their_own_resume(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create([
            'name' => 'My CV',
            'pdf_filename' => 'my-cv.pdf',
            'summary' => 'A great developer.',
            'skills' => ['PHP', 'React'],
        ]);

        $response = $this->actingAs($user)
            ->post(route('builder.duplicate', $resume->id));

        $copy = Resume::where('name', 'Copy of My CV')->first();
        $this->assertNotNull($copy);
        $response->assertRedirect(route('builder.edit', $copy->id));
        $this->assertEquals('A great developer.', $copy->summary);
        $this->assertEquals(['PHP', 'React'], $copy->skills);
        $this->assertNotEquals($resume->id, $copy->id);
    }

    public function test_user_cannot_duplicate_another_users_resume(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $resume = $owner->resumes()->create(['name' => 'Secret CV', 'pdf_filename' => 'x.pdf']);

        $this->actingAs($other)
            ->post(route('builder.duplicate', $resume->id))
            ->assertForbidden();
    }

    public function test_mark_all_questions_read(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);
        $link = $resume->shareLinks()->create();
        $link->questions()->createMany([
            ['resume_id' => $resume->id, 'sender_name' => 'A', 'sender_email' => 'a@x.com', 'message' => 'Hi', 'is_read' => false],
            ['resume_id' => $resume->id, 'sender_name' => 'B', 'sender_email' => 'b@x.com', 'message' => 'Hey', 'is_read' => false],
        ]);

        $this->actingAs($user)
            ->patch(route('questions.read-all', $resume->id))
            ->assertRedirect();

        $this->assertDatabaseMissing('resume_questions', ['resume_id' => $resume->id, 'is_read' => false]);
    }

    public function test_new_style_columns_have_expected_defaults(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'Test', 'pdf_filename' => 'test.pdf']);

        $this->assertEquals('#4f46e5', $resume->fresh()->accent_color);
        $this->assertEquals('sans', $resume->fresh()->font_family);
    }

    public function test_accent_color_and_font_family_are_mass_assignable(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create([
            'name' => 'Test',
            'pdf_filename' => 'test.pdf',
            'accent_color' => '#166534',
            'font_family' => 'serif',
        ]);

        $this->assertEquals('#166534', $resume->fresh()->accent_color);
        $this->assertEquals('serif', $resume->fresh()->font_family);
    }

    public function test_new_templates_are_accepted(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'Test', 'pdf_filename' => 'test.pdf']);

        foreach (['sidebar', 'creative', 'executive', 'ats'] as $template) {
            $this->actingAs($user)->put(route('builder.update', $resume->id), [
                'name' => 'Test',
                'template' => $template,
            ])->assertRedirect();

            $this->assertDatabaseHas('resumes', ['id' => $resume->id, 'template' => $template]);
        }
    }

    public function test_valid_accent_color_is_accepted(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'Test', 'pdf_filename' => 'test.pdf']);

        $this->actingAs($user)->put(route('builder.update', $resume->id), [
            'name' => 'Test',
            'accent_color' => '#1e3a5f',
        ])->assertRedirect();

        $this->assertDatabaseHas('resumes', ['id' => $resume->id, 'accent_color' => '#1e3a5f']);
    }

    public function test_invalid_accent_color_is_rejected(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'Test', 'pdf_filename' => 'test.pdf']);

        $this->actingAs($user)->put(route('builder.update', $resume->id), [
            'name' => 'Test',
            'accent_color' => '#ff00ff',
        ])->assertSessionHasErrors('accent_color');
    }

    public function test_valid_font_family_is_accepted(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'Test', 'pdf_filename' => 'test.pdf']);

        foreach (['sans', 'serif', 'mono'] as $family) {
            $this->actingAs($user)->put(route('builder.update', $resume->id), [
                'name' => 'Test',
                'font_family' => $family,
            ])->assertRedirect();

            $this->assertDatabaseHas('resumes', ['id' => $resume->id, 'font_family' => $family]);
        }
    }

    public function test_invalid_font_family_is_rejected(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'Test', 'pdf_filename' => 'test.pdf']);

        $this->actingAs($user)->put(route('builder.update', $resume->id), [
            'name' => 'Test',
            'font_family' => 'comic-sans',
        ])->assertSessionHasErrors('font_family');
    }

    public function test_duplicate_copies_new_style_fields(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create([
            'name' => 'Orig',
            'pdf_filename' => 'orig.pdf',
            'template' => 'creative',
            'accent_color' => '#7f1d1d',
            'font_family' => 'serif',
        ]);

        $this->actingAs($user)->post(route('builder.duplicate', $resume->id));

        $copy = Resume::where('name', 'Copy of Orig')->first();
        $this->assertNotNull($copy);
        $this->assertEquals('creative', $copy->template);
        $this->assertEquals('#7f1d1d', $copy->accent_color);
        $this->assertEquals('serif', $copy->font_family);
    }

    public function test_edit_passes_is_first_resume_true_for_first_resume_of_new_user(): void
    {
        $user = User::factory()->create(['has_completed_onboarding' => false]);
        $resume = $user->resumes()->create([
            'name'         => 'My CV',
            'pdf_filename' => 'a.pdf',
        ]);

        $this->actingAs($user)
            ->get(route('builder.edit', $resume->id))
            ->assertInertia(fn ($page) => $page
                ->component('ResumeBuilder/Edit')
                ->where('isFirstResume', true)
            );
    }

    public function test_edit_passes_is_first_resume_false_when_onboarding_completed(): void
    {
        $user = User::factory()->create(['has_completed_onboarding' => true]);
        $resume = $user->resumes()->create([
            'name'         => 'My CV',
            'pdf_filename' => 'a.pdf',
        ]);

        $this->actingAs($user)
            ->get(route('builder.edit', $resume->id))
            ->assertInertia(fn ($page) => $page->where('isFirstResume', false));
    }

    public function test_edit_passes_is_first_resume_false_when_user_has_multiple_resumes(): void
    {
        $user = User::factory()->create(['has_completed_onboarding' => false]);
        $first = $user->resumes()->create(['name' => 'A', 'pdf_filename' => 'a.pdf']);
        $user->resumes()->create(['name' => 'B', 'pdf_filename' => 'b.pdf']);

        $this->actingAs($user)
            ->get(route('builder.edit', $first->id))
            ->assertInertia(fn ($page) => $page->where('isFirstResume', false));
    }
}
