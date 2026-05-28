<?php

namespace Tests\Feature;

use App\Mail\NewQuestionReceived;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class NewQuestionMailTest extends TestCase
{
    use RefreshDatabase;

    public function test_email_is_queued_when_question_submitted(): void
    {
        Mail::fake();

        $user = User::factory()->create(['email' => 'owner@example.com']);
        $resume = $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);
        $link = $resume->shareLinks()->create(['is_active' => true]);

        $this->post(route('public.question', $link->token), [
            'sender_name' => 'Alice',
            'sender_email' => 'alice@example.com',
            'message' => 'Are you available?',
        ]);

        Mail::assertQueued(NewQuestionReceived::class, function ($mail) {
            return $mail->hasTo('owner@example.com');
        });
    }

    public function test_mail_failure_does_not_break_question_submission(): void
    {
        Mail::shouldReceive('to')->andThrow(new \Exception('Mail server down'));

        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);
        $link = $resume->shareLinks()->create(['is_active' => true]);

        $response = $this->post(route('public.question', $link->token), [
            'sender_name' => 'Bob',
            'sender_email' => 'bob@example.com',
            'message' => 'Hello',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('resume_questions', ['sender_name' => 'Bob']);
    }
}
