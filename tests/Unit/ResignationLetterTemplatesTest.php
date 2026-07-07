<?php

namespace Tests\Unit;

use App\Data\ResignationLetterTemplates;
use Tests\TestCase;

class ResignationLetterTemplatesTest extends TestCase
{
    public function test_render_substitutes_placeholders(): void
    {
        $body = ResignationLetterTemplates::render('standard', [
            'name' => 'Jane Doe',
            'role' => 'Engineer',
            'company' => 'Acme',
            'last_day' => '2026-08-01',
        ]);

        $this->assertStringContainsString('Jane Doe', $body);
        $this->assertStringContainsString('Engineer', $body);
        $this->assertStringContainsString('Acme', $body);
        $this->assertStringContainsString('2026-08-01', $body);
        $this->assertStringNotContainsString('{{', $body);
    }

    public function test_render_falls_back_to_defaults_for_missing_vars(): void
    {
        $body = ResignationLetterTemplates::render('standard');

        $this->assertStringContainsString('[Company]', $body);
        $this->assertStringContainsString('[Role]', $body);
        $this->assertStringContainsString('[Last Day]', $body);
    }

    public function test_keys_returns_all_template_keys(): void
    {
        $this->assertSame(['standard', 'immediate', 'warm'], ResignationLetterTemplates::keys());
    }
}
