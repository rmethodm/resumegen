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

    /**
     * Timestamps in the output are not cosmetic. The nine template samples in
     * public/images/templates are committed, so a timestamp chunk made every
     * `thumbnails:templates` run dirty all nine files with pixel-identical output —
     * churn indistinguishable from a real change. User thumbnails are worse: they
     * carried a creation time into a file recruiters receive.
     */
    public function test_it_embeds_no_timestamps(): void
    {
        if (! extension_loaded('imagick')) {
            $this->markTestSkipped('Imagick not installed.');
        }

        $resume = Resume::factory()->for(User::factory())->create(['template' => 'classic']);

        $png = app(ResumeThumbnailGenerator::class)->generate($resume);

        $this->assertStringNotContainsString('date:create', $png);
        $this->assertStringNotContainsString('date:modify', $png);
        $this->assertStringNotContainsString('date:timestamp', $png);
        $this->assertStringNotContainsString('tIME', $png);
    }
}
