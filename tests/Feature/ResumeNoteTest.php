<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\ResumeNote;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResumeNoteTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_add_note_to_resume(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->post(route('builder.notes.store', $resume), [
                'body' => 'Emphasize the migration project for this application.',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('resume_notes', [
            'resume_id' => $resume->id,
            'body' => 'Emphasize the migration project for this application.',
        ]);
    }

    public function test_user_cannot_add_note_to_others_resume(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $resume = Resume::factory()->for($other)->create();

        $this->actingAs($user)
            ->post(route('builder.notes.store', $resume), [
                'body' => 'Hack',
            ])
            ->assertForbidden();
    }

    public function test_user_can_update_own_note(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $note = ResumeNote::factory()->create(['resume_id' => $resume->id, 'body' => 'Original']);

        $this->actingAs($user)
            ->patch(route('builder.notes.update', [$resume, $note]), ['body' => 'Updated'])
            ->assertRedirect();

        $this->assertSame('Updated', $note->fresh()->body);
    }

    public function test_user_can_delete_own_note(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $note = ResumeNote::factory()->create(['resume_id' => $resume->id]);

        $this->actingAs($user)
            ->delete(route('builder.notes.destroy', [$resume, $note]))
            ->assertRedirect();

        $this->assertDatabaseMissing('resume_notes', ['id' => $note->id]);
    }

    public function test_user_cannot_delete_others_note(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $resume = Resume::factory()->for($other)->create();
        $note = ResumeNote::factory()->create(['resume_id' => $resume->id]);

        $this->actingAs($user)
            ->delete(route('builder.notes.destroy', [$resume, $note]))
            ->assertForbidden();
    }

    public function test_note_from_a_different_resume_cannot_be_deleted_via_this_resume(): void
    {
        $user = User::factory()->create();
        $resumeA = Resume::factory()->for($user)->create();
        $resumeB = Resume::factory()->for($user)->create();
        $note = ResumeNote::factory()->create(['resume_id' => $resumeB->id]);

        $this->actingAs($user)
            ->delete(route('builder.notes.destroy', [$resumeA, $note]))
            ->assertForbidden();
    }

    public function test_notes_are_deleted_when_resume_is_deleted(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $note = ResumeNote::factory()->create(['resume_id' => $resume->id]);

        $resume->delete();

        $this->assertDatabaseMissing('resume_notes', ['id' => $note->id]);
    }

    public function test_notes_returned_when_editing_resume(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        ResumeNote::factory()->create(['resume_id' => $resume->id, 'body' => 'Remember to tailor this.']);

        $response = $this->actingAs($user)
            ->get(route('builder.edit', $resume));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->has('notes', 1));
    }
}
