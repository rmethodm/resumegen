<?php
namespace Tests\Feature;

use App\Models\User;
use App\Models\Resume;
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
            'name'     => 'Test',
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
            'name'     => 'Test',
            'template' => 'not-a-real-template',
        ]);

        $response->assertSessionHasErrors('template');
    }

    public function test_user_can_duplicate_their_own_resume(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create([
            'name'         => 'My CV',
            'pdf_filename' => 'my-cv.pdf',
            'summary'      => 'A great developer.',
            'skills'       => ['PHP', 'React'],
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
}
