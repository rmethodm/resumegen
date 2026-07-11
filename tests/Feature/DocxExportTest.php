<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DocxExportTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_download_docx(): void
    {
        $user = User::factory()->starter()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->get(route('builder.docx', $resume));

        $response->assertOk();
        $response->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    }

    public function test_other_user_cannot_download_docx(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $other->id]);

        $this->actingAs($user)->get(route('builder.docx', $resume))->assertForbidden();
    }

    public function test_guest_cannot_download_docx(): void
    {
        $resume = Resume::factory()->create();

        $this->get(route('builder.docx', $resume))->assertRedirect(route('login'));
    }

    /**
     * DOCX is now included on every tier, so a free user must get the file
     * itself — not a redirect into the upgrade modal.
     */
    public function test_free_user_can_download_docx(): void
    {
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->get(route('builder.docx', $resume));

        $response->assertOk();
        $response->assertSessionMissing('featureGate');
    }
}
