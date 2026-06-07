<?php

namespace Tests\Feature;

use App\Models\CareerArticle;
use App\Models\User;
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

    // -------------------------------------------------------------------------
    // Admin routes
    // -------------------------------------------------------------------------

    public function test_admin_can_create_article(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);

        $this->actingAs($admin)
            ->post('/admin/career', [
                'title' => 'New Career Article',
                'body' => '<p>'.str_repeat('word ', 100).'</p>',
                'category' => 'Resume Tips',
                'meta_description' => 'A short description.',
                'is_published' => false,
            ])
            ->assertRedirect(route('admin.career.index'));

        $this->assertDatabaseHas('career_articles', [
            'title' => 'New Career Article',
            'category' => 'Resume Tips',
        ]);
    }

    public function test_admin_create_sets_published_at_when_published(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);

        $this->actingAs($admin)
            ->post('/admin/career', [
                'title' => 'Live Article',
                'body' => '<p>'.str_repeat('word ', 50).'</p>',
                'category' => 'Job Search',
                'is_published' => true,
            ])
            ->assertRedirect(route('admin.career.index'));

        $article = CareerArticle::where('title', 'Live Article')->firstOrFail();

        $this->assertTrue($article->is_published);
        $this->assertNotNull($article->published_at);
    }

    public function test_admin_can_update_article(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $article = CareerArticle::factory()->published()->create(['title' => 'Original Title']);

        $this->actingAs($admin)
            ->put(route('admin.career.update', $article), [
                'title' => 'Updated Title',
                'body' => '<p>'.str_repeat('word ', 60).'</p>',
                'category' => 'Interviews',
                'is_published' => true,
            ])
            ->assertRedirect(route('admin.career.index'));

        $this->assertDatabaseHas('career_articles', [
            'id' => $article->id,
            'title' => 'Updated Title',
        ]);
    }

    public function test_admin_update_sets_published_at_when_flipping_to_published(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $article = CareerArticle::factory()->draft()->create();

        $this->assertNull($article->published_at);

        $this->actingAs($admin)
            ->put(route('admin.career.update', $article), [
                'title' => $article->title,
                'body' => $article->body,
                'category' => $article->category,
                'is_published' => true,
            ])
            ->assertRedirect(route('admin.career.index'));

        $this->assertNotNull($article->fresh()->published_at);
    }

    public function test_admin_can_delete_article(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $article = CareerArticle::factory()->published()->create();

        $this->actingAs($admin)
            ->delete(route('admin.career.destroy', $article))
            ->assertRedirect(route('admin.career.index'));

        $this->assertDatabaseMissing('career_articles', ['id' => $article->id]);
    }

    public function test_non_admin_cannot_access_admin_career_routes(): void
    {
        $user = User::factory()->free()->create();

        $this->actingAs($user)
            ->get('/admin/career')
            ->assertForbidden();
    }
}
