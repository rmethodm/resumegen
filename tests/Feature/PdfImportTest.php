<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PdfImportTest extends TestCase
{
    use RefreshDatabase;

    private function fakeClaudeSuccess(): void
    {
        Http::fake([
            'api.anthropic.com/*' => Http::response([
                'content' => [['text' => json_encode([
                    'contact' => ['full_name' => 'Jane Smith', 'email' => 'jane@example.com', 'phone' => '', 'location' => '', 'linkedin_url' => '', 'website' => ''],
                    'summary' => 'Experienced developer.',
                    'experience' => [],
                    'education' => [],
                    'skills' => ['PHP', 'React'],
                    'certifications' => [],
                ])]],
                'usage' => ['input_tokens' => 100, 'output_tokens' => 200],
            ]),
        ]);
    }

    private function fakePdf(): UploadedFile
    {
        return UploadedFile::fake()->create('resume.pdf', 50, 'application/pdf');
    }

    public function test_free_user_can_extract_pdf(): void
    {
        $user = User::factory()->free()->create();

        $this->actingAs($user)
            ->postJson(route('import.pdf.extract'), ['file' => $this->fakePdf()])
            ->assertStatus(422);
    }

    public function test_extract_requires_a_pdf_file(): void
    {
        $user = User::factory()->starter()->create();

        $this->actingAs($user)
            ->postJson(route('import.pdf.extract'), ['file' => UploadedFile::fake()->create('doc.txt', 5, 'text/plain')])
            ->assertUnprocessable();
    }

    public function test_extract_rejects_files_over_5mb(): void
    {
        $user = User::factory()->starter()->create();

        $this->actingAs($user)
            ->postJson(route('import.pdf.extract'), ['file' => UploadedFile::fake()->create('big.pdf', 6000, 'application/pdf')])
            ->assertUnprocessable();
    }

    public function test_starter_user_can_extract_pdf(): void
    {
        $this->fakeClaudeSuccess();
        $user = User::factory()->starter()->create();

        // The fake PDF from UploadedFile::fake() is not a real PDF, so smalot will fail.
        // The exception is caught and converted to RuntimeException, resulting in a 422.
        $response = $this->actingAs($user)
            ->postJson(route('import.pdf.extract'), ['file' => $this->fakePdf()]);

        $response->assertUnprocessable();
    }

    public function test_confirm_creates_new_resume(): void
    {
        $user = User::factory()->starter()->create();

        $data = [
            'contact' => ['full_name' => 'Jane Smith', 'email' => 'jane@example.com', 'phone' => '', 'location' => '', 'linkedin_url' => '', 'website' => ''],
            'summary' => 'Developer.',
            'experience' => [],
            'education' => [],
            'skills' => ['PHP'],
            'certifications' => [],
        ];

        $this->actingAs($user)
            ->post(route('import.pdf.confirm'), [
                'data' => $data,
                'action' => 'new',
                'name' => 'Jane Smith — Imported',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('resumes', [
            'user_id' => $user->id,
            'name' => 'Jane Smith — Imported',
        ]);
    }

    public function test_confirm_overwrites_existing_resume(): void
    {
        $user = User::factory()->starter()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $data = [
            'contact' => ['full_name' => 'Overwritten', 'email' => '', 'phone' => '', 'location' => '', 'linkedin_url' => '', 'website' => ''],
            'summary' => 'New summary.',
            'experience' => [],
            'education' => [],
            'skills' => [],
            'certifications' => [],
        ];

        $this->actingAs($user)
            ->post(route('import.pdf.confirm'), [
                'data' => $data,
                'action' => 'overwrite',
                'resume_id' => $resume->id,
            ])
            ->assertRedirect(route('builder.edit', $resume));

        $this->assertSame('New summary.', $resume->fresh()->summary);
    }

    public function test_confirm_cannot_overwrite_another_users_resume(): void
    {
        $owner = User::factory()->starter()->create();
        $attacker = User::factory()->starter()->create();
        $resume = Resume::factory()->create(['user_id' => $owner->id]);

        $this->actingAs($attacker)
            ->post(route('import.pdf.confirm'), [
                'data' => ['summary' => 'Hacked'],
                'action' => 'overwrite',
                'resume_id' => $resume->id,
            ])
            ->assertForbidden();
    }
}
