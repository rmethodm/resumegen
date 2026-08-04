<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserAdminFlagsTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_factory_admin_and_disabled_states(): void
    {
        $admin = User::factory()->admin()->create();
        $disabled = User::factory()->disabled()->create();

        $this->assertTrue($admin->is_admin);
        $this->assertTrue($admin->isAdmin());
        $this->assertNotNull($disabled->disabled_at);
        $this->assertTrue($disabled->isDisabled());
        $this->assertFalse($admin->isDisabled());
    }
}
