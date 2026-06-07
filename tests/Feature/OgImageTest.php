<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\ResumeShareLink;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OgImageTest extends TestCase
{
    use RefreshDatabase;

    public function test_og_image_returns_svg_for_valid_token(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create([
            'name' => 'Software Engineer Resume',
            'contact' => ['full_name' => 'Jane Doe', 'title' => 'Senior Engineer'],
            'accent_color' => '#6366f1',
        ]);
        $link = ResumeShareLink::factory()->for($resume)->create(['is_active' => true]);

        $response = $this->get(route('public.og-image', $link->token));

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'image/svg+xml');
        $this->assertStringContainsString('Jane Doe', $response->getContent());
        $this->assertStringContainsString('Senior Engineer', $response->getContent());
    }

    public function test_og_image_falls_back_gracefully_without_contact(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create([
            'name' => 'My Resume',
            'contact' => null,
            'accent_color' => null,
        ]);
        $link = ResumeShareLink::factory()->for($resume)->create(['is_active' => true]);

        $response = $this->get(route('public.og-image', $link->token));

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'image/svg+xml');
        $this->assertStringContainsString('My Resume', $response->getContent());
    }

    public function test_og_image_returns_404_for_invalid_token(): void
    {
        $response = $this->get('/r/invalid-token-xyz/og-image');

        $response->assertStatus(404);
    }

    public function test_og_image_has_cache_control_header(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $link = ResumeShareLink::factory()->for($resume)->create(['is_active' => true]);

        $response = $this->get(route('public.og-image', $link->token));

        $response->assertHeader('Cache-Control', 'max-age=3600, public');
    }

    public function test_public_resume_page_contains_og_meta_tags(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create([
            'contact' => ['full_name' => 'Jane Doe', 'title' => 'Engineer'],
        ]);
        $link = ResumeShareLink::factory()->for($resume)->create(['is_active' => true]);

        $response = $this->get(route('public.resume', $link->token));

        $response->assertStatus(200);
        $content = $response->getContent();
        $this->assertStringContainsString('og:title', $content);
        $this->assertStringContainsString('og:image', $content);
        $this->assertStringContainsString('twitter:card', $content);
        $this->assertStringContainsString('Jane Doe', $content);
    }
}
