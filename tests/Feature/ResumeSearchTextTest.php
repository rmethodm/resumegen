<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResumeSearchTextTest extends TestCase
{
    use RefreshDatabase;

    public function test_search_text_is_populated_from_content_on_save(): void
    {
        $user = User::factory()->create();

        $resume = Resume::factory()->for($user)->create([
            'name' => 'Backend Engineer Resume',
            'summary' => 'Seasoned Golang developer',
            'experience' => [['company' => 'Acme', 'bullets' => ['Built a payments pipeline']]],
            'skills' => ['Kubernetes', 'PostgreSQL'],
        ]);

        $this->assertStringContainsString('backend engineer resume', $resume->search_text);
        $this->assertStringContainsString('seasoned golang developer', $resume->search_text);
        $this->assertStringContainsString('built a payments pipeline', $resume->search_text);
        $this->assertStringContainsString('kubernetes', $resume->search_text);
    }

    public function test_search_text_refreshes_when_content_changes(): void
    {
        $resume = Resume::factory()->create(['summary' => 'Original text']);
        $resume->update(['summary' => 'Completely new wording']);

        $this->assertStringContainsString('completely new wording', $resume->search_text);
        $this->assertStringNotContainsString('original text', $resume->search_text);
    }
}
