<?php

namespace Tests\Feature\Api;

use App\Mail\VisitorThreadReply;
use App\Models\Resume;
use App\Models\ResumeShareLink;
use App\Models\ResumeThread;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;

class ThreadReplyApiTest extends ApiTestCase
{
    use RefreshDatabase;

    public function test_owner_can_reply_to_thread(): void
    {
        Mail::fake();
        $user = User::factory()->create();
        $token = $user->createToken('ext')->plainTextToken;
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $thread = ResumeThread::create([
            'resume_id' => $resume->id,
            'sender_name' => 'Alice',
            'sender_email' => 'alice@example.com',
            'is_read' => false,
        ]);

        $response = $this->withToken($token)->postJson(
            "/api/threads/{$thread->id}/reply",
            ['body' => 'Thanks for reaching out!']
        );

        $response->assertStatus(201)
            ->assertJsonStructure(['id', 'body', 'is_owner', 'created_at'])
            ->assertJsonPath('body', 'Thanks for reaching out!')
            ->assertJsonPath('is_owner', true);

        $this->assertDatabaseHas('resume_thread_messages', [
            'thread_id' => $thread->id,
            'body' => 'Thanks for reaching out!',
            'is_owner' => true,
        ]);
    }

    public function test_reply_marks_thread_as_read(): void
    {
        Mail::fake();
        $user = User::factory()->create();
        $token = $user->createToken('ext')->plainTextToken;
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $thread = ResumeThread::create([
            'resume_id' => $resume->id,
            'sender_name' => 'Bob',
            'sender_email' => 'bob@example.com',
            'is_read' => false,
        ]);

        $this->withToken($token)->postJson(
            "/api/threads/{$thread->id}/reply",
            ['body' => 'Hello!']
        )->assertStatus(201);

        $this->assertTrue($thread->fresh()->is_read);
    }

    public function test_reply_queues_visitor_reply_mailable_when_share_link_exists(): void
    {
        Mail::fake();
        $user = User::factory()->create();
        $token = $user->createToken('ext')->plainTextToken;
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $link = ResumeShareLink::factory()->create(['resume_id' => $resume->id, 'is_active' => true]);
        $thread = ResumeThread::create([
            'resume_id' => $resume->id,
            'share_link_id' => $link->id,
            'sender_name' => 'Carol',
            'sender_email' => 'carol@example.com',
            'is_read' => false,
        ]);

        $this->withToken($token)->postJson(
            "/api/threads/{$thread->id}/reply",
            ['body' => 'Hi Carol!']
        )->assertStatus(201);

        Mail::assertQueued(VisitorThreadReply::class);
    }

    public function test_non_owner_receives_403(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $token = $user->createToken('ext')->plainTextToken;
        $resume = Resume::factory()->create(['user_id' => $other->id]);
        $thread = ResumeThread::create([
            'resume_id' => $resume->id,
            'sender_name' => 'Dave',
            'sender_email' => 'dave@example.com',
            'is_read' => false,
        ]);

        $this->withToken($token)->postJson(
            "/api/threads/{$thread->id}/reply",
            ['body' => 'Sneaky!']
        )->assertForbidden();
    }

    public function test_guest_receives_401(): void
    {
        $this->postJson('/api/threads/1/reply', ['body' => 'x'])->assertUnauthorized();
    }

    public function test_empty_body_returns_validation_error(): void
    {
        Mail::fake();
        $user = User::factory()->create();
        $token = $user->createToken('ext')->plainTextToken;
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $thread = ResumeThread::create([
            'resume_id' => $resume->id,
            'sender_name' => 'Eve',
            'sender_email' => 'eve@example.com',
            'is_read' => false,
        ]);

        $this->withToken($token)->postJson(
            "/api/threads/{$thread->id}/reply",
            ['body' => '']
        )->assertUnprocessable();
    }
}
