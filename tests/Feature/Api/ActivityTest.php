<?php

namespace Tests\Feature\Api;

use App\Models\Resume;
use App\Models\ResumeShareEvent;
use App\Models\ResumeShareLink;
use App\Models\ResumeThread;
use App\Models\ResumeThreadMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ActivityTest extends ApiTestCase
{
    use RefreshDatabase;

    public function test_guest_receives_401(): void
    {
        $this->getJson('/api/activity')->assertUnauthorized();
    }

    public function test_returns_events_and_threads_for_authed_user(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('ext')->plainTextToken;
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $link = ResumeShareLink::factory()->create(['resume_id' => $resume->id]);

        ResumeShareEvent::create([
            'resume_id' => $resume->id,
            'resume_share_link_id' => $link->id,
            'event' => 'page_view',
        ]);

        $thread = ResumeThread::create([
            'resume_id' => $resume->id,
            'sender_name' => 'Alice',
            'sender_email' => 'alice@example.com',
            'is_read' => false,
        ]);
        ResumeThreadMessage::create([
            'thread_id' => $thread->id,
            'body' => 'Hello there',
            'is_owner' => false,
        ]);

        $response = $this->withToken($token)->getJson('/api/activity');

        $response->assertOk()
            ->assertJsonStructure([
                'events' => [['type', 'resume_id', 'resume_name', 'occurred_at']],
                'threads' => [['id', 'resume_id', 'resume_name', 'is_read', 'sender_name', 'occurred_at', 'messages']],
                'unread_count',
            ])
            ->assertJsonPath('events.0.type', 'page_view')
            ->assertJsonPath('threads.0.sender_name', 'Alice')
            ->assertJsonPath('threads.0.is_read', false)
            ->assertJsonPath('threads.0.messages.0.body', 'Hello there')
            ->assertJsonPath('unread_count', 1);
    }

    public function test_excludes_other_users_data(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $token = $user->createToken('ext')->plainTextToken;

        $otherResume = Resume::factory()->create(['user_id' => $other->id]);
        $link = ResumeShareLink::factory()->create(['resume_id' => $otherResume->id]);
        ResumeShareEvent::create([
            'resume_id' => $otherResume->id,
            'resume_share_link_id' => $link->id,
            'event' => 'page_view',
        ]);
        ResumeThread::create([
            'resume_id' => $otherResume->id,
            'sender_name' => 'Hacker',
            'sender_email' => 'h@example.com',
            'is_read' => false,
        ]);

        $response = $this->withToken($token)->getJson('/api/activity');

        $response->assertOk()
            ->assertJsonPath('events', [])
            ->assertJsonPath('threads', [])
            ->assertJsonPath('unread_count', 0);
    }

    public function test_events_capped_at_10_newest_first(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('ext')->plainTextToken;
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $link = ResumeShareLink::factory()->create(['resume_id' => $resume->id]);

        for ($i = 0; $i < 12; $i++) {
            ResumeShareEvent::create([
                'resume_id' => $resume->id,
                'resume_share_link_id' => $link->id,
                'event' => 'page_view',
            ]);
        }

        $response = $this->withToken($token)->getJson('/api/activity');

        $response->assertOk()
            ->assertJsonCount(10, 'events');
    }

    public function test_question_submitted_events_are_excluded(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('ext')->plainTextToken;
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $link = ResumeShareLink::factory()->create(['resume_id' => $resume->id]);

        ResumeShareEvent::create([
            'resume_id' => $resume->id,
            'resume_share_link_id' => $link->id,
            'event' => 'question_submitted',
        ]);

        $response = $this->withToken($token)->getJson('/api/activity');

        $response->assertOk()->assertJsonPath('events', []);
    }

    public function test_unread_count_reflects_actual_unread_threads(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('ext')->plainTextToken;
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        ResumeThread::create(['resume_id' => $resume->id, 'sender_name' => 'A', 'sender_email' => 'a@x.com', 'is_read' => false]);
        ResumeThread::create(['resume_id' => $resume->id, 'sender_name' => 'B', 'sender_email' => 'b@x.com', 'is_read' => true]);

        $this->withToken($token)->getJson('/api/activity')
            ->assertOk()
            ->assertJsonPath('unread_count', 1);
    }
}
