<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\ResumeShareLink;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PortfolioTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_portfolio_shows_resumes_with_active_share_links(): void
    {
        $user = User::factory()->create([
            'portfolio_slug' => 'jane-doe',
            'portfolio_headline' => 'Full-Stack Engineer',
            'portfolio_is_public' => true,
        ]);
        $resume = Resume::factory()->for($user)->create(['name' => 'My Resume']);
        ResumeShareLink::factory()->for($resume)->create(['is_active' => true]);

        $response = $this->get(route('portfolio.show', 'jane-doe'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Portfolio/Show')
            ->has('resumes', 1)
        );
    }

    public function test_private_portfolio_returns_404(): void
    {
        User::factory()->create([
            'portfolio_slug' => 'hidden-user',
            'portfolio_is_public' => false,
        ]);

        $response = $this->get(route('portfolio.show', 'hidden-user'));

        $response->assertStatus(404);
    }

    public function test_portfolio_404_for_unknown_slug(): void
    {
        $response = $this->get(route('portfolio.show', 'nobody'));

        $response->assertStatus(404);
    }

    public function test_portfolio_excludes_resumes_without_active_share_links(): void
    {
        $user = User::factory()->create([
            'portfolio_slug' => 'partial-user',
            'portfolio_is_public' => true,
        ]);
        Resume::factory()->for($user)->create();
        // No share link — should not appear

        $response = $this->get(route('portfolio.show', 'partial-user'));

        $response->assertInertia(fn ($page) => $page->has('resumes', 0));
    }

    public function test_portfolio_settings_update_saves_fields(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->patch(route('portfolio.update'), [
            'portfolio_slug' => 'my-slug',
            'portfolio_headline' => 'Engineer',
            'portfolio_bio' => 'A brief bio.',
            'portfolio_is_public' => true,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'portfolio_slug' => 'my-slug',
        ]);
    }

    public function test_portfolio_slug_uniqueness_enforced(): void
    {
        User::factory()->create(['portfolio_slug' => 'taken']);
        $user = User::factory()->create();

        $response = $this->actingAs($user)->patch(route('portfolio.update'), [
            'portfolio_slug' => 'taken',
            'portfolio_is_public' => false,
        ]);

        $response->assertSessionHasErrors('portfolio_slug');
    }
}
