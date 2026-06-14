<?php

namespace Tests\Unit;

use App\Models\Resume;
use App\Models\User;
use App\Services\ResumeThumbnailGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResumeThumbnailGeneratorTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_returns_png_bytes_for_a_resume(): void
    {
        if (! extension_loaded('imagick')) {
            $this->markTestSkipped('Imagick not installed.');
        }

        $resume = Resume::factory()->for(User::factory())->create(['template' => 'classic']);

        $png = app(ResumeThumbnailGenerator::class)->generate($resume);

        $this->assertNotEmpty($png);
        $this->assertSame("\x89PNG", substr($png, 0, 4), 'Output is not a PNG.');
    }
}
