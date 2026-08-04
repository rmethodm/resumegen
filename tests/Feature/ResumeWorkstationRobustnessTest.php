<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\ResumeSnapshot;
use App\Models\User;
use App\Support\ResumeDocument;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResumeWorkstationRobustnessTest extends TestCase
{
    use RefreshDatabase;

    public function test_workstation_includes_versions_notes_and_snapshots(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $resume->notes()->create([
            'body' => 'Check metrics',
            'x' => 10,
            'y' => 20,
            'width' => 240,
            'height' => 140,
        ]);
        $resume->snapshots()->create([
            'label' => 'Before rewrite',
            'document' => ResumeDocument::toArray($resume),
        ]);

        $this->actingAs($user)
            ->get(route('resumes.workstation', $resume))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Resumes/Workstation')
                ->has('versions')
                ->has('notes', 1)
                ->has('snapshots', 1)
                ->where('snapshots.0.label', 'Before rewrite')
                ->has('resume.updated_at')
            );
    }

    public function test_pdf_preview_streams_inline_for_owner(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create([
            'full_name' => 'Jane Doe',
        ]);

        $this->actingAs($user)
            ->get(route('resumes.preview', $resume))
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }

    public function test_snapshot_store_and_restore(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create([
            'summary' => 'Original summary text that is long enough.',
        ]);

        $this->actingAs($user)
            ->post(route('resume-snapshots.store', $resume), [
                'label' => 'v1',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('resume_snapshots', [
            'resume_id' => $resume->id,
            'label' => 'v1',
        ]);

        $snapshot = ResumeSnapshot::query()->where('resume_id', $resume->id)->firstOrFail();

        $resume->update(['summary' => 'Changed after checkpoint.']);

        $this->actingAs($user)
            ->post(route('resume-snapshots.restore', [
                'resume' => $resume,
                'snapshot' => $snapshot,
            ]))
            ->assertRedirect();

        $this->assertSame(
            'Original summary text that is long enough.',
            $resume->fresh()->summary,
        );
    }

    public function test_update_conflict_when_base_updated_at_is_stale(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create([
            'title' => 'Base',
        ]);

        $payload = ResumeDocument::toArray($resume);
        unset($payload['id']);
        $payload['title'] = 'Should not save';
        $payload['base_updated_at'] = now()->subDay()->toIso8601String();

        // Ensure server timestamp is newer than the client token.
        $resume->forceFill(['updated_at' => now()])->saveQuietly();

        $this->actingAs($user)
            ->put(route('resumes.update', $resume), $payload)
            ->assertRedirect()
            ->assertSessionHasErrors('conflict');

        $this->assertSame('Base', $resume->fresh()->title);
    }

    public function test_guest_cannot_preview_pdf(): void
    {
        $resume = Resume::factory()->create();

        $this->get(route('resumes.preview', $resume))
            ->assertRedirect();
    }
}
