<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class BuilderRedirectsToWorkstationTest extends TestCase
{
    use RefreshDatabase;

    public function test_legacy_builder_edit_redirects_to_workstation(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->get(route('builder.edit', $resume))
            ->assertRedirect(route('resumes.workstation', $resume));
    }

    public function test_resumes_builder_url_redirects_to_workstation(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->get(route('resumes.builder', $resume))
            ->assertRedirect(route('resumes.workstation', $resume));
    }

    public function test_legacy_builder_index_redirects_to_dashboard(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('builder.index'))
            ->assertRedirect(route('dashboard'));
    }

    public function test_legacy_builder_create_redirects_to_dashboard(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('builder.create'))
            ->assertRedirect(route('dashboard'));
    }

    public function test_strangers_cannot_open_legacy_builder_edit(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $resume = Resume::factory()->for($owner)->create();

        $this->actingAs($intruder)
            ->get(route('builder.edit', $resume))
            ->assertForbidden();
    }

    /**
     * Old bookmarks to the pre-Workstation PDF endpoints must land on the
     * current DomPDF export/preview, not the deleted resume-pdf view.
     */
    public function test_legacy_builder_pdf_urls_redirect_to_current_export_routes(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->get(route('builder.pdf', $resume))
            ->assertRedirect(route('resumes.download', $resume));

        $this->actingAs($user)
            ->get(route('builder.preview', $resume))
            ->assertRedirect(route('resumes.preview', $resume));

        $this->actingAs($user)
            ->get(route('builder.html-preview', $resume))
            ->assertRedirect(route('resumes.preview', $resume));
    }

    public function test_strangers_cannot_follow_legacy_builder_pdf_urls(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $resume = Resume::factory()->for($owner)->create();

        $this->actingAs($intruder)
            ->get(route('builder.pdf', $resume))
            ->assertForbidden();
    }

    /**
     * The legacy save/delete paths bypassed the Workstation's document
     * shape and concurrency check; they must stay unroutable.
     */
    public function test_legacy_builder_write_endpoints_are_gone(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->assertFalse(Route::has('builder.update'));
        $this->assertFalse(Route::has('builder.destroy'));
        $this->assertFalse(Route::has('builder.beacon'));

        $this->actingAs($user)->put("/builder/{$resume->id}", ['title' => 'x'])->assertMethodNotAllowed();
        $this->actingAs($user)->delete("/builder/{$resume->id}")->assertMethodNotAllowed();
        $this->actingAs($user)->post("/builder/{$resume->id}/beacon")->assertNotFound();

        $this->assertModelExists($resume);
    }
}
