<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApplyWizardTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_users_prefer_the_wizard_and_have_not_dismissed_the_checklist(): void
    {
        $user = User::factory()->create();

        $this->assertTrue($user->fresh()->prefers_apply_wizard);
        $this->assertNull($user->fresh()->dismissed_checklist_at);
    }
}
