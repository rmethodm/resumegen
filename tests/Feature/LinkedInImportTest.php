<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\PdfResumeParser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class LinkedInImportTest extends TestCase
{
    use RefreshDatabase;

    public function test_parser_accepts_linkedin_hint_and_returns_extracted_data(): void
    {
        Http::fake([
            'https://api.anthropic.com/*' => Http::response([
                'content' => [['text' => json_encode([
                    'contact' => ['full_name' => 'Jane Smith', 'email' => 'jane@example.com', 'phone' => '', 'location' => '', 'linkedin_url' => '', 'website' => ''],
                    'summary' => 'Software engineer',
                    'experience' => [['title' => 'Engineer', 'company' => 'Acme', 'start_date' => '2022', 'end_date' => '', 'current' => true, 'bullets' => 'Built things']],
                    'education' => [['degree' => 'BS', 'field' => 'CS', 'school' => 'MIT', 'grad_year' => '2022']],
                    'skills' => ['PHP', 'React'],
                    'certifications' => [],
                ])]],
                'usage' => ['input_tokens' => 100, 'output_tokens' => 200],
            ], 200),
        ]);

        $file = UploadedFile::fake()->createWithContent('linkedin.pdf', '%PDF-1.4 Experience Engineer at Acme Education MIT Skills PHP React');

        $parser = $this->getMockBuilder(PdfResumeParser::class)
            ->onlyMethods(['extractText'])
            ->getMock();

        $parser->method('extractText')->willReturn('LinkedIn\nExperience\nEngineer at Acme\nEducation\nMIT BS CS 2022\nSkills\nPHP, React');

        $result = $parser->parse($file, null, 'linkedin');

        $this->assertIsArray($result['data']);
        $this->assertEquals('Jane Smith', $result['data']['contact']['full_name']);
    }

    public function test_parser_generic_hint_is_default(): void
    {
        Http::fake([
            'https://api.anthropic.com/*' => Http::response([
                'content' => [['text' => json_encode([
                    'contact' => ['full_name' => 'Bob', 'email' => '', 'phone' => '', 'location' => '', 'linkedin_url' => '', 'website' => ''],
                    'summary' => '',
                    'experience' => [],
                    'education' => [],
                    'skills' => [],
                    'certifications' => [],
                ])]],
                'usage' => ['input_tokens' => 50, 'output_tokens' => 100],
            ], 200),
        ]);

        $file = UploadedFile::fake()->createWithContent('resume.pdf', '%PDF-1.4 Bob');

        $parser = $this->getMockBuilder(PdfResumeParser::class)
            ->onlyMethods(['extractText'])
            ->getMock();

        $parser->method('extractText')->willReturn('Bob Jones resume');

        $result = $parser->parse($file, null);

        $this->assertEquals('Bob', $result['data']['contact']['full_name']);
    }

    public function test_extract_endpoint_accepts_hint_field(): void
    {
        config(['services.anthropic.key' => 'test-key']);

        Http::fake([
            'https://api.anthropic.com/*' => Http::response([
                'content' => [['text' => json_encode([
                    'contact' => ['full_name' => 'Alice', 'email' => '', 'phone' => '', 'location' => '', 'linkedin_url' => '', 'website' => ''],
                    'summary' => '',
                    'experience' => [],
                    'education' => [],
                    'skills' => [],
                    'certifications' => [],
                ])]],
                'usage' => ['input_tokens' => 50, 'output_tokens' => 100],
            ], 200),
        ]);

        $user = User::factory()->free()->create();

        $response = $this->actingAs($user)->post(route('import.pdf.extract'), [
            'file' => UploadedFile::fake()->createWithContent('linkedin.pdf', '%PDF-1.4 Alice Experience'),
            'hint' => 'linkedin',
        ]);

        // Fake PDFs cannot be parsed by smalot, so the parser returns 422.
        // The important assertion is that 'hint' passed validation (not rejected)
        // and the endpoint was not blocked with 402.
        $response->assertStatus(422);
        $response->assertJsonMissingValidationErrors('hint');
    }

    public function test_free_user_can_access_pdf_import(): void
    {
        config(['services.anthropic.key' => 'test-key']);

        $user = User::factory()->free()->create();

        $response = $this->actingAs($user)->post(route('import.pdf.extract'), [
            'file' => UploadedFile::fake()->createWithContent('resume.pdf', '%PDF-1.4 Test User'),
        ]);

        // Free users are not blocked by a tier gate (no 402).
        // The fake PDF cannot be parsed by smalot, so we get 422 from the parser — not 402.
        $response->assertStatus(422);
        $response->assertJsonMissingValidationErrors('file');
    }

    public function test_confirm_with_linkedin_hint_flashes_linked_in_imported(): void
    {
        $user = User::factory()->free()->create();

        $data = [
            'contact' => ['full_name' => 'Jane', 'email' => 'jane@example.com', 'phone' => '', 'location' => '', 'linkedin_url' => '', 'website' => ''],
            'summary' => '',
            'experience' => [],
            'education' => [],
            'skills' => [],
            'certifications' => [],
        ];

        $response = $this->actingAs($user)->post(route('import.pdf.confirm'), [
            'data' => $data,
            'action' => 'new',
            'name' => 'Jane LinkedIn Resume',
            'hint' => 'linkedin',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('linkedInImported', true);
        $response->assertSessionMissing('pdfImported');
    }

    public function test_extract_rejects_invalid_hint_value(): void
    {
        $user = User::factory()->free()->create();

        $response = $this->actingAs($user)
            ->withHeader('Accept', 'application/json')
            ->post(route('import.pdf.extract'), [
                'file' => UploadedFile::fake()->createWithContent('r.pdf', '%PDF-1.4'),
                'hint' => 'badvalue',
            ]);

        $response->assertJsonValidationErrors(['hint']);
    }

    public function test_confirm_without_hint_flashes_pdf_imported(): void
    {
        $user = User::factory()->free()->create();

        $data = [
            'contact' => ['full_name' => 'Bob', 'email' => '', 'phone' => '', 'location' => '', 'linkedin_url' => '', 'website' => ''],
            'summary' => '',
            'experience' => [],
            'education' => [],
            'skills' => [],
            'certifications' => [],
        ];

        $response = $this->actingAs($user)->post(route('import.pdf.confirm'), [
            'data' => $data,
            'action' => 'new',
            'name' => 'Bob Resume',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('pdfImported', true);
    }
}
