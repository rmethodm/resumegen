<?php

namespace Tests\Feature;

use App\Models\InterviewNote;
use App\Models\JobApplication;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InterviewNoteTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_add_note_to_own_application(): void
    {
        $user = User::factory()->create();
        $job = JobApplication::factory()->for($user)->create();

        $this->actingAs($user)
            ->post(route('jobs.notes.store', $job), ['body' => 'Good first interview.'])
            ->assertRedirect();

        $this->assertDatabaseHas('interview_notes', [
            'job_application_id' => $job->id,
            'body' => 'Good first interview.',
        ]);
    }

    public function test_notes_returned_on_edit_page(): void
    {
        $user = User::factory()->create();
        $job = JobApplication::factory()->for($user)->create();

        InterviewNote::create(['job_application_id' => $job->id, 'body' => 'First note']);
        InterviewNote::create(['job_application_id' => $job->id, 'body' => 'Second note']);

        $this->actingAs($user)
            ->get(route('jobs.edit', $job))
            ->assertInertia(
                fn ($page) => $page->component('Jobs/Edit')
                    ->has('notes_log', 2)
            );
    }

    public function test_user_cannot_add_note_to_others_application(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $job = JobApplication::factory()->for($owner)->create();

        $this->actingAs($other)
            ->post(route('jobs.notes.store', $job), ['body' => 'Hacking notes'])
            ->assertForbidden();
    }

    public function test_empty_body_rejected(): void
    {
        $user = User::factory()->create();
        $job = JobApplication::factory()->for($user)->create();

        $this->actingAs($user)
            ->post(route('jobs.notes.store', $job), ['body' => ''])
            ->assertSessionHasErrors('body');
    }

    public function test_user_can_delete_own_note(): void
    {
        $user = User::factory()->create();
        $job = JobApplication::factory()->for($user)->create();
        $note = InterviewNote::create(['job_application_id' => $job->id, 'body' => 'Delete me.']);

        $this->actingAs($user)
            ->delete(route('jobs.notes.destroy', [$job, $note]))
            ->assertRedirect();

        $this->assertDatabaseMissing('interview_notes', ['id' => $note->id]);
    }

    public function test_user_cannot_delete_note_from_others_application(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $job = JobApplication::factory()->for($owner)->create();
        $note = InterviewNote::create(['job_application_id' => $job->id, 'body' => 'Private note.']);

        $this->actingAs($other)
            ->delete(route('jobs.notes.destroy', [$job, $note]))
            ->assertForbidden();
    }
}
