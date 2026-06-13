<?php

namespace Tests\Feature\Admin;

use App\Models\AiRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AiAdminSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_ai_request_stores_flagged_text(): void
    {
        $row = AiRequest::factory()->create(['status' => 'flagged', 'flagged_text' => 'bad input']);

        $this->assertSame('bad input', $row->fresh()->flagged_text);
    }

    public function test_user_has_ai_admin_columns_with_defaults(): void
    {
        $user = User::factory()->create();

        $this->assertNull($user->ai_limit_override);
        $this->assertFalse($user->ai_blocked);
        $this->assertNull($user->ai_usage_reset_at);
    }
}
