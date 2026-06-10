<?php

namespace Tests\Feature;

use App\Mail\VisitorThreadReply;
use App\Models\ResumeThread;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class ResumeThreadTest extends TestCase
{
    use RefreshDatabase;

    private function makeThread(User $owner): array
    {
        $resume = $owner->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);
        $link = $resume->shareLinks()->create(['is_active' => true]);
        $thread = ResumeThread::create([
            'resume_id' => $resume->id,
            'share_link_id' => $link->id,
            'sender_name' => 'Alice',
            'sender_email' => 'alice@example.com',
        ]);
        $thread->messages()->create(['body' => 'Hello!', 'is_owner' => false]);

        return [$resume, $link, $thread];
    }

    public function test_owner_can_view_thread(): void
    {
        $owner = User::factory()->create();
        [$resume, , $thread] = $this->makeThread($owner);

        $this->actingAs($owner)
            ->get(route('builder.thread', [$resume->id, $thread->id]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('ResumeBuilder/Thread'));
    }

    public function test_other_user_cannot_view_thread(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        [$resume, , $thread] = $this->makeThread($owner);

        $this->actingAs($other)
            ->get(route('builder.thread', [$resume->id, $thread->id]))
            ->assertForbidden();
    }

    public function test_owner_can_reply_to_thread(): void
    {
        Mail::fake();
        $owner = User::factory()->create();
        [$resume, , $thread] = $this->makeThread($owner);

        $this->actingAs($owner)
            ->post(route('builder.thread.reply', [$resume->id, $thread->id]), [
                'body' => 'Thanks for reaching out!',
            ])->assertRedirect();

        $this->assertDatabaseHas('resume_thread_messages', [
            'thread_id' => $thread->id,
            'body' => 'Thanks for reaching out!',
            'is_owner' => true,
        ]);
    }

    public function test_owner_reply_marks_thread_read(): void
    {
        Mail::fake();
        $owner = User::factory()->create();
        [$resume, , $thread] = $this->makeThread($owner);

        $this->actingAs($owner)
            ->post(route('builder.thread.reply', [$resume->id, $thread->id]), [
                'body' => 'Reply here',
            ]);

        $this->assertTrue($thread->fresh()->is_read);
    }

    public function test_owner_reply_queues_mail_to_visitor(): void
    {
        Mail::fake();
        $owner = User::factory()->create();
        [$resume, , $thread] = $this->makeThread($owner);

        $this->actingAs($owner)
            ->post(route('builder.thread.reply', [$resume->id, $thread->id]), [
                'body' => 'Hello back',
            ]);

        Mail::assertQueued(VisitorThreadReply::class, fn ($m) => $m->hasTo('alice@example.com'));
    }

    public function test_owner_can_mark_thread_read(): void
    {
        $owner = User::factory()->create();
        [$resume, , $thread] = $this->makeThread($owner);

        $this->actingAs($owner)
            ->patch(route('builder.thread.read', [$resume->id, $thread->id]))
            ->assertRedirect();

        $this->assertTrue($thread->fresh()->is_read);
    }

    public function test_owner_can_delete_thread(): void
    {
        $owner = User::factory()->create();
        [$resume, , $thread] = $this->makeThread($owner);

        $this->actingAs($owner)
            ->delete(route('builder.thread.destroy', [$resume->id, $thread->id]))
            ->assertRedirect(route('messages.index'));

        $this->assertModelMissing($thread);
    }

    public function test_deleting_thread_cascades_messages(): void
    {
        $owner = User::factory()->create();
        [$resume, , $thread] = $this->makeThread($owner);

        $this->actingAs($owner)
            ->delete(route('builder.thread.destroy', [$resume->id, $thread->id]));

        $this->assertDatabaseCount('resume_thread_messages', 0);
    }

    public function test_messages_index_does_not_fire_n_plus_1_queries(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);

        // Create 5 threads with 3 messages each
        for ($i = 0; $i < 5; $i++) {
            $link = $resume->shareLinks()->create(['is_active' => true]);
            $thread = ResumeThread::create([
                'resume_id' => $resume->id,
                'share_link_id' => $link->id,
                'sender_name' => "Visitor {$i}",
                'sender_email' => "visitor{$i}@example.com",
            ]);
            for ($j = 0; $j < 3; $j++) {
                $thread->messages()->create(['body' => "Message {$j}", 'is_owner' => false]);
            }
        }

        $queryCount = 0;
        \DB::listen(function () use (&$queryCount) {
            $queryCount++;
        });

        $this->actingAs($user)->get(route('messages.index'));

        // Should be ~3-5 queries total, not 5+1 for count per thread
        $this->assertLessThanOrEqual(8, $queryCount, "Expected <= 8 queries but got {$queryCount}");
    }
}
