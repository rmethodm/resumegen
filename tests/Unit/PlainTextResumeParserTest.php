<?php

namespace Tests\Unit;

use App\Support\PlainTextResumeParser;
use PHPUnit\Framework\TestCase;

class PlainTextResumeParserTest extends TestCase
{
    public function test_parses_contact_sections_and_bullets(): void
    {
        $text = <<<'TXT'
Jane Doe
Software Engineer
jane@example.com | 555-0100

SUMMARY
Builder of reliable TypeScript products.

EXPERIENCE
Software Engineer — Acme Corp
2020 – Present
• Shipped React features for 50k users
• Cut API latency 30%

SKILLS
TypeScript, React, Testing, CI/CD
TXT;

        $doc = PlainTextResumeParser::parse($text);

        $this->assertSame('Jane Doe', $doc['full_name']);
        $this->assertSame('jane@example.com', $doc['email']);
        $this->assertStringContainsString('Builder of reliable', $doc['summary']);
        $this->assertNotEmpty($doc['experiences']);
        $this->assertSame('Software Engineer', $doc['experiences'][0]['title']);
        $this->assertContains('Shipped React features for 50k users', $doc['experiences'][0]['bullets']);
        $this->assertGreaterThanOrEqual(3, count($doc['skills']));
    }

    public function test_empty_text_returns_placeholder_experience(): void
    {
        $doc = PlainTextResumeParser::parse('');

        $this->assertSame('', $doc['full_name']);
        $this->assertCount(1, $doc['experiences']);
    }
}
