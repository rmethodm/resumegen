<?php

namespace Tests\Feature;

use App\Console\Commands\GenerateTemplateThumbnails;
use App\Models\Resume;
use App\Models\User;
use App\Services\ResumeThumbnailGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResumeThumbnailTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        array_map('unlink', glob(storage_path('app/thumbnails/*.png')) ?: []);
        parent::tearDown();
    }

    public function test_owner_gets_a_png(): void
    {
        $this->mock(ResumeThumbnailGenerator::class)
            ->shouldReceive('generate')->andReturn("\x89PNG\r\n\x1a\nfake");

        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->get(route('builder.thumbnail', $resume))
            ->assertOk()
            ->assertHeader('Content-Type', 'image/png');
    }

    public function test_non_owner_is_forbidden(): void
    {
        $resume = Resume::factory()->for(User::factory())->create();

        $this->actingAs(User::factory()->create())
            ->get(route('builder.thumbnail', $resume))
            ->assertForbidden();
    }

    public function test_cache_is_reused_until_resume_changes(): void
    {
        $spy = $this->mock(ResumeThumbnailGenerator::class);
        $spy->shouldReceive('generate')->once()->andReturn("\x89PNG\r\n\x1a\nfake");

        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->get(route('builder.thumbnail', $resume))->assertOk();
        $this->actingAs($user)->get(route('builder.thumbnail', $resume))->assertOk();
    }

    public function test_stale_cache_is_regenerated(): void
    {
        $spy = $this->mock(ResumeThumbnailGenerator::class);
        $spy->shouldReceive('generate')->twice()->andReturn("\x89PNG\r\n\x1a\nfake");

        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->get(route('builder.thumbnail', $resume))->assertOk();

        touch(storage_path("app/thumbnails/{$resume->id}.png"), time() - 60);
        $resume->touch();

        $this->actingAs($user)->get(route('builder.thumbnail', $resume))->assertOk();
    }

    public function test_placeholder_is_served_when_generation_fails(): void
    {
        $this->mock(ResumeThumbnailGenerator::class)
            ->shouldReceive('generate')->andThrow(new \RuntimeException('no imagick'));

        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create(['accent_color' => '#4f46e5']);

        $this->actingAs($user)
            ->get(route('builder.thumbnail', $resume))
            ->assertOk()
            ->assertHeader('Content-Type', 'image/png');
    }

    public function test_deleting_a_resume_removes_its_cached_thumbnail(): void
    {
        $resume = Resume::factory()->for(User::factory())->create();

        $dir = storage_path('app/thumbnails');
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        $path = "{$dir}/{$resume->id}.png";
        file_put_contents($path, 'x');
        $this->assertFileExists($path);

        $resume->delete();

        $this->assertFileDoesNotExist($path);
    }

    public function test_template_thumbnail_command_writes_an_image_per_template(): void
    {
        if (! extension_loaded('imagick')) {
            $this->markTestSkipped('Imagick not installed.');
        }

        $this->artisan('thumbnails:templates')->assertExitCode(0);

        foreach (GenerateTemplateThumbnails::TEMPLATES as $template) {
            $this->assertFileExists(public_path("images/templates/{$template}.png"));
        }
    }
}
