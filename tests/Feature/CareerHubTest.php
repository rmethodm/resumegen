<?php

namespace Tests\Feature;

use App\Models\CareerArticle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CareerHubTest extends TestCase
{
    use RefreshDatabase;

    // -------------------------------------------------------------------------
    // Public routes
    // -------------------------------------------------------------------------

    public function test_public_index_returns_only_published_articles(): void
    {
        $published = CareerArticle::factory()->published()->create(['title' => 'Published Article']);
        $draft = CareerArticle::factory()->draft()->create(['title' => 'Draft Article']);

        $this->get('/career')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('CareerHub/Index')
                ->where('articles', fn ($articles) => collect($articles)
                    ->contains('id', $published->id)
                )
                ->where('articles', fn ($articles) => ! collect($articles)
                    ->contains('id', $draft->id)
                )
            );
    }

    public function test_public_index_passes_categories_prop(): void
    {
        $this->get('/career')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('CareerHub/Index')
                ->where('categories', CareerArticle::CATEGORIES)
            );
    }

    public function test_public_show_returns_published_article(): void
    {
        $article = CareerArticle::factory()->published()->create(['title' => 'My Published Post']);

        $this->get('/career/'.$article->slug)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('CareerHub/Show')
                ->where('article.id', $article->id)
            );
    }

    public function test_public_show_404s_on_unpublished_article(): void
    {
        $draft = CareerArticle::factory()->draft()->create(['title' => 'Hidden Draft']);

        $this->get('/career/'.$draft->slug)
            ->assertNotFound();
    }

    public function test_public_show_404s_on_nonexistent_slug(): void
    {
        $this->get('/career/this-slug-does-not-exist')
            ->assertNotFound();
    }

    public function test_public_routes_require_no_authentication(): void
    {
        $this->get('/career')
            ->assertOk();
    }
}
