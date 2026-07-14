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
}
