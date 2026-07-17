<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Inertia\Testing\AssertableInertia;
use OpenAI\Contracts\ClientContract;
use OpenAI\Responses\Chat\CreateResponse;
use OpenAI\Responses\Moderations\CreateResponse as ModerationResponse;
use OpenAI\Testing\ClientFake;
use Tests\TestCase;

class ResumeImportTest extends TestCase
{
    use RefreshDatabase;

    private function fakeReply(string $content): void
    {
        $this->app->instance(ClientContract::class, new ClientFake([
            ModerationResponse::fake(['results' => [['flagged' => false]]]),
            CreateResponse::fake([
                'model' => 'gpt-4o-mini',
                'choices' => [['index' => 0, 'message' => ['role' => 'assistant', 'content' => $content]]],
                'usage' => ['prompt_tokens' => 5, 'completion_tokens' => 5, 'total_tokens' => 10],
            ]),
        ]));
    }

    private function pdfUpload(string $text = 'John Doe — Senior Engineer at Acme'): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            'resume.pdf',
            Pdf::loadHTML("<p>{$text}</p>")->output(),
        );
    }

    public function test_create_page_renders_with_templates_and_resumes(): void
    {
        $user = User::factory()->create();
        Resume::factory()->for($user)->create(['name' => 'Existing']);

        $this->actingAs($user)
            ->get(route('builder.create'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('ResumeBuilder/Create')
                ->where('resumeCount', 1)
                ->has('allowedTemplates')
                ->has('resumes', 1));
    }

    public function test_store_accepts_a_template_choice(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('builder.store'), [
            'name' => 'Templated',
            'template' => 'executive',
        ]);

        $this->assertDatabaseHas('resumes', [
            'user_id' => $user->id,
            'name' => 'Templated',
            'template' => 'executive',
        ]);
    }

    public function test_store_rejects_unknown_template(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->from(route('builder.create'))
            ->post(route('builder.store'), ['name' => 'X', 'template' => 'not-a-template'])
            ->assertSessionHasErrors('template');
    }

    public function test_extract_parses_pdf_and_returns_structured_data(): void
    {
        config()->set('ai.monthly_limit', 10);
        $this->fakeReply(json_encode([
            'contact' => ['full_name' => 'John Doe', 'email' => 'john@example.com'],
            'summary' => 'Senior engineer.',
            'skills' => ['Go'],
        ]));
        $user = User::factory()->create();

        $res = $this->actingAs($user)->post(route('import.pdf.extract'), [
            'file' => $this->pdfUpload(),
        ]);

        $res->assertOk()
            ->assertJsonPath('detected_name', 'John Doe')
            ->assertJsonPath('data.contact.email', 'john@example.com');

        $this->assertDatabaseHas('ai_requests', [
            'user_id' => $user->id,
            'feature' => 'import_resume',
            'status' => 'success',
        ]);
    }

    public function test_extract_rejects_users_over_their_ai_limit(): void
    {
        config()->set('ai.monthly_limit', 0);
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('import.pdf.extract'), [
            'file' => $this->pdfUpload(),
        ])->assertStatus(402);
    }

    public function test_confirm_creates_a_new_resume_from_imported_data(): void
    {
        $user = User::factory()->create();

        $res = $this->actingAs($user)->post(route('import.pdf.confirm'), [
            'action' => 'new',
            'name' => 'John — Imported',
            'data' => [
                'contact' => ['full_name' => 'John Doe'],
                'summary' => 'Senior engineer.',
                'skills' => ['Go', 'Postgres'],
            ],
        ]);

        $resume = Resume::where('user_id', $user->id)->firstOrFail();
        $res->assertRedirect(route('builder.edit', $resume->id));
        $this->assertSame('John — Imported', $resume->name);
        $this->assertSame('John Doe', $resume->contact['full_name']);
        $this->assertSame(['Go', 'Postgres'], $resume->skills);
    }

    public function test_confirm_overwrites_an_existing_resume(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create(['summary' => 'Old summary']);

        $this->actingAs($user)->post(route('import.pdf.confirm'), [
            'action' => 'overwrite',
            'resume_id' => $resume->id,
            'data' => ['summary' => 'Imported summary'],
        ])->assertRedirect(route('builder.edit', $resume->id));

        $this->assertSame('Imported summary', $resume->fresh()->summary);
    }

    public function test_confirm_cannot_overwrite_another_users_resume(): void
    {
        $user = User::factory()->create();
        $other = Resume::factory()->create(['summary' => 'Theirs']);

        $this->actingAs($user)->post(route('import.pdf.confirm'), [
            'action' => 'overwrite',
            'resume_id' => $other->id,
            'data' => ['summary' => 'Hijacked'],
        ])->assertForbidden();

        $this->assertSame('Theirs', $other->fresh()->summary);
    }
}
