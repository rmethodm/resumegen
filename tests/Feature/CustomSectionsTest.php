<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomSectionsTest extends TestCase
{
    use RefreshDatabase;

    private function makeSection(string $id, string $name): array
    {
        return [
            'id' => $id,
            'name' => $name,
            'entries' => [
                [
                    'id' => 'entry-1',
                    'title' => 'My Paper',
                    'subtitle' => 'Journal of Things',
                    'start_date' => '2024-03',
                    'end_date' => null,
                    'description' => 'A great paper.',
                    'bullets' => ['Finding one', 'Finding two'],
                ],
            ],
        ];
    }

    public function test_custom_sections_can_be_saved(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $sections = [$this->makeSection('abc', 'Publications')];

        $this->actingAs($user)
            ->put(route('builder.update', $resume), ['custom_sections' => $sections])
            ->assertRedirect();

        $saved = $resume->fresh()->custom_sections;
        $this->assertCount(1, $saved);
        $this->assertSame('Publications', $saved[0]['name']);
        $this->assertSame('My Paper', $saved[0]['entries'][0]['title']);
    }

    public function test_free_user_can_save_up_to_2_custom_sections(): void
    {
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $sections = [
            $this->makeSection('s1', 'Publications'),
            $this->makeSection('s2', 'Projects'),
        ];

        $this->actingAs($user)
            ->put(route('builder.update', $resume), ['custom_sections' => $sections])
            ->assertRedirect();

        $this->assertCount(2, $resume->fresh()->custom_sections);
    }

    public function test_free_user_cannot_save_more_than_2_custom_sections(): void
    {
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $sections = [
            $this->makeSection('s1', 'Publications'),
            $this->makeSection('s2', 'Projects'),
            $this->makeSection('s3', 'Awards'),
        ];

        $this->actingAs($user)
            ->put(route('builder.update', $resume), ['custom_sections' => $sections])
            ->assertStatus(302);

        // Resume should not have been updated with 3 sections
        $this->assertNull($resume->fresh()->custom_sections);
    }

    public function test_starter_user_can_save_unlimited_custom_sections(): void
    {
        $user = User::factory()->starter()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $sections = array_map(
            fn ($i) => $this->makeSection("s{$i}", "Section {$i}"),
            range(1, 10)
        );

        $this->actingAs($user)
            ->put(route('builder.update', $resume), ['custom_sections' => $sections])
            ->assertRedirect();

        $this->assertCount(10, $resume->fresh()->custom_sections);
    }

    public function test_custom_section_limit_is_returned_in_edit_props(): void
    {
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->get(route('builder.edit', $resume));
        $response->assertInertia(fn ($page) => $page->has('customSectionLimit'));
    }
}
