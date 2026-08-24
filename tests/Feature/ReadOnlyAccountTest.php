<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReadOnlyAccountTest extends TestCase
{
    use RefreshDatabase;

    private function readOnlyUser(): User
    {
        $user = User::factory()->create();
        $user->is_read_only = true;
        $user->save();

        return $user;
    }

    public function test_read_only_user_can_view_pages(): void
    {
        $user = $this->readOnlyUser();

        $this->actingAs($user)->get(route('dashboard'))->assertOk();
    }

    public function test_read_only_user_cannot_update_a_resume(): void
    {
        $user = $this->readOnlyUser();
        $resume = Resume::factory()->for($user)->create(['title' => 'Original']);

        $this->actingAs($user)
            ->from(route('dashboard'))
            ->put(route('resumes.update', $resume), ['title' => 'Changed'])
            ->assertRedirect(route('dashboard'))
            ->assertSessionHas('error');

        $this->assertSame('Original', $resume->fresh()->title);
    }

    public function test_read_only_user_cannot_delete_a_resume(): void
    {
        $user = $this->readOnlyUser();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->from(route('dashboard'))
            ->delete(route('resumes.destroy', $resume))
            ->assertRedirect(route('dashboard'));

        $this->assertNotNull($resume->fresh());
    }

    public function test_read_only_user_can_log_out(): void
    {
        $user = $this->readOnlyUser();

        $this->actingAs($user)->post(route('logout'))->assertRedirect('/');
        $this->assertGuest();
    }

    public function test_normal_user_writes_are_unaffected(): void
    {
        $user = User::factory()->create();
        // First resume in a group is delete-protected; delete a second one.
        $first = Resume::factory()->for($user)->create();
        $resume = Resume::factory()->for($user)->create(['group_id' => $first->group_id]);

        $this->actingAs($user)->delete(route('resumes.destroy', $resume));

        $this->assertNull($resume->fresh());
    }
}
