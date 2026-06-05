<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SectionOrderTest extends TestCase
{
    use RefreshDatabase;

    public function test_section_order_can_be_saved(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $order = ['summary', 'skills', 'experience', 'education', 'certifications'];

        $this->actingAs($user)
            ->put(route('builder.update', $resume), ['section_order' => $order])
            ->assertRedirect();

        $this->assertSame($order, $resume->fresh()->section_order);
    }

    public function test_section_order_persists_across_saves(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)->put(route('builder.update', $resume), [
            'section_order' => ['skills', 'summary', 'experience', 'education', 'certifications'],
        ]);

        $this->actingAs($user)->put(route('builder.update', $resume), [
            'summary' => 'Updated summary',
        ]);

        $this->assertSame(
            ['skills', 'summary', 'experience', 'education', 'certifications'],
            $resume->fresh()->section_order
        );
    }

    public function test_other_user_cannot_update_section_order(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $owner->id]);

        $this->actingAs($other)
            ->put(route('builder.update', $resume), ['section_order' => ['summary']])
            ->assertForbidden();
    }
}
