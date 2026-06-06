<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\ResumeShareLink;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShareUrlTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_url_for_existing_active_link(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $link = ResumeShareLink::factory()->create(['resume_id' => $resume->id, 'is_active' => true]);

        $response = $this->actingAs($user)->get(route('builder.share-url', $resume));

        $response->assertStatus(200);
        $response->assertJsonPath('url', route('public.resume', $link->token));
    }

    public function test_creates_share_link_if_none_exists(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $this->assertDatabaseCount('resume_share_links', 0);

        $response = $this->actingAs($user)->get(route('builder.share-url', $resume));

        $response->assertStatus(200);
        $response->assertJsonStructure(['url']);
        $this->assertDatabaseCount('resume_share_links', 1);
    }

    public function test_creates_link_if_only_inactive_link_exists(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        ResumeShareLink::factory()->create(['resume_id' => $resume->id, 'is_active' => false]);

        $response = $this->actingAs($user)->get(route('builder.share-url', $resume));

        $response->assertStatus(200);
        $this->assertDatabaseCount('resume_share_links', 2);
    }

    public function test_cannot_get_share_url_for_another_users_resume(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $owner->id]);

        $response = $this->actingAs($other)->get(route('builder.share-url', $resume));

        $response->assertStatus(403);
    }

    public function test_unauthenticated_user_cannot_get_share_url(): void
    {
        $resume = Resume::factory()->create();

        $response = $this->get(route('builder.share-url', $resume));

        $response->assertRedirect('/login');
    }
}
