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
}
