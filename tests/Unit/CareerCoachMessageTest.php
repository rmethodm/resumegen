<?php

namespace Tests\Unit;

use App\Models\CareerCoachMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CareerCoachMessageTest extends TestCase
{
    use RefreshDatabase;

    public function test_message_belongs_to_user(): void
    {
        $user = User::factory()->create();

        $message = CareerCoachMessage::create([
            'user_id' => $user->id,
            'role' => 'user',
            'content' => 'How do I switch careers?',
        ]);

        $this->assertTrue($message->user->is($user));
        $this->assertDatabaseHas('career_coach_messages', [
            'id' => $message->id,
            'role' => 'user',
            'content' => 'How do I switch careers?',
        ]);
    }

    public function test_deletes_when_user_deleted(): void
    {
        $user = User::factory()->create();
        CareerCoachMessage::create([
            'user_id' => $user->id,
            'role' => 'user',
            'content' => 'Hi',
        ]);

        $user->delete();

        $this->assertDatabaseCount('career_coach_messages', 0);
    }
}
