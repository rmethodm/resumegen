<?php

namespace Tests\Unit;

use App\Support\RoleSamples;
use PHPUnit\Framework\TestCase;

class RoleSamplesTest extends TestCase
{
    public function test_catalogue_lists_known_samples(): void
    {
        $ids = RoleSamples::ids();

        $this->assertContains('software-engineer', $ids);
        $this->assertCount(count($ids), RoleSamples::catalogue());
    }

    public function test_find_returns_document_with_experiences(): void
    {
        $sample = RoleSamples::find('software-engineer');

        $this->assertNotNull($sample);
        $this->assertSame('Software Engineer', $sample['target_role']);
        $this->assertNotEmpty($sample['document']['experiences']);
        $this->assertNotEmpty($sample['document']['skills']);
    }
}
