<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ResumeApiTest extends ApiTestCase
{
    use RefreshDatabase;

    private function token(User $user): string
    {
        return $user->createToken('test')->plainTextToken;
    }

    public function test_can_list_resumes(): void
    {
        $user = User::factory()->create();
        $user->resumes()->createMany([
            ['name' => 'Resume A', 'pdf_filename' => 'a.pdf'],
            ['name' => 'Resume B', 'pdf_filename' => 'b.pdf'],
        ]);

        $this->withToken($this->token($user))
            ->getJson('/api/resumes')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_can_create_resume(): void
    {
        $user = User::factory()->create();

        $this->withToken($this->token($user))
            ->postJson('/api/resumes', ['name' => 'My New Resume'])
            ->assertCreated()
            ->assertJsonPath('name', 'My New Resume');
    }

    public function test_cannot_create_resume_past_free_limit(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        $user->resumes()->createMany(array_fill(0, 5, ['name' => 'R', 'pdf_filename' => 'r.pdf']));

        $this->withToken($this->token($user))
            ->postJson('/api/resumes', ['name' => 'One Too Many'])
            ->assertStatus(402)
            ->assertJsonPath('required_tier', 'starter');
    }

    public function test_api_store_blocks_free_user_at_limit_with_402(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        for ($i = 0; $i < 5; $i++) {
            $user->resumes()->create(['name' => "Resume $i", 'pdf_filename' => "$i.pdf"]);
        }
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/resumes', ['name' => 'Sixth'])
            ->assertStatus(402)
            ->assertJsonPath('required_tier', 'starter');
    }

    public function test_api_store_allows_starter_user_under_limit(): void
    {
        $user = User::factory()->starter()->create();
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/resumes', ['name' => 'First'])
            ->assertCreated();
    }

    public function test_resume_limit_is_enforced_for_free_tier(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        // Create 5 resumes to hit the free limit
        $user->resumes()->createMany(array_fill(0, 5, ['name' => 'R', 'pdf_filename' => 'r.pdf']));

        $this->withToken($this->token($user))
            ->postJson('/api/resumes', ['name' => 'One Too Many'])
            ->assertStatus(402)
            ->assertJsonPath('required_tier', 'starter');
    }

    public function test_can_show_own_resume(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);

        $this->withToken($this->token($user))
            ->getJson("/api/resumes/{$resume->id}")
            ->assertOk()
            ->assertJsonPath('id', $resume->id);
    }

    public function test_cannot_show_other_users_resume(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $resume = $owner->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);

        $this->withToken($this->token($other))
            ->getJson("/api/resumes/{$resume->id}")
            ->assertForbidden();
    }

    public function test_can_update_resume(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'Old', 'pdf_filename' => 'old.pdf']);

        $this->withToken($this->token($user))
            ->putJson("/api/resumes/{$resume->id}", ['name' => 'New Name'])
            ->assertOk()
            ->assertJsonPath('name', 'New Name');
    }

    public function test_can_delete_resume(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'Gone', 'pdf_filename' => 'g.pdf']);

        $this->withToken($this->token($user))
            ->deleteJson("/api/resumes/{$resume->id}")
            ->assertNoContent();

        $this->assertModelMissing($resume);
    }

    public function test_can_duplicate_resume(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create([
            'name' => 'Original', 'pdf_filename' => 'o.pdf', 'summary' => 'Senior dev',
        ]);

        $response = $this->withToken($this->token($user))
            ->postJson("/api/resumes/{$resume->id}/duplicate")
            ->assertCreated();

        $this->assertEquals('Copy of Original', $response->json('name'));
        $this->assertEquals('Senior dev', $response->json('summary'));
    }

    public function test_duplicate_preserves_custom_sections_and_section_order(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create([
            'name' => 'Original',
            'pdf_filename' => 'o.pdf',
            'custom_sections' => [['title' => 'Volunteering', 'body' => 'Red Cross']],
            'section_order' => ['summary', 'experience', 'education', 'custom_volunteering'],
        ]);

        $response = $this->withToken($this->token($user))
            ->postJson("/api/resumes/{$resume->id}/duplicate")
            ->assertCreated();

        $this->assertEquals([['title' => 'Volunteering', 'body' => 'Red Cross']], $response->json('custom_sections'));
        $this->assertEquals(['summary', 'experience', 'education', 'custom_volunteering'], $response->json('section_order'));
    }

    public function test_can_download_resume_pdf(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create([
            'name' => 'My Resume', 'pdf_filename' => 'my-resume.pdf',
        ]);

        $this->withToken($this->token($user))
            ->get("/api/resumes/{$resume->id}/pdf")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }

    public function test_cannot_download_another_users_resume_pdf(): void
    {
        $owner = User::factory()->create();
        $resume = $owner->resumes()->create(['name' => 'Private', 'pdf_filename' => 'p.pdf']);

        $other = User::factory()->create();

        $this->withToken($this->token($other))
            ->get("/api/resumes/{$resume->id}/pdf")
            ->assertForbidden();
    }
}
