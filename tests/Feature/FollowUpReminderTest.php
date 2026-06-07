<?php

namespace Tests\Feature;

use App\Mail\FollowUpReminderMail;
use App\Models\JobApplication;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class FollowUpReminderTest extends TestCase
{
    use RefreshDatabase;

    public function test_command_sends_mail_for_todays_followups(): void
    {
        Mail::fake();

        $user = User::factory()->create(['email' => 'test@example.com']);
        JobApplication::factory()->create([
            'user_id' => $user->id,
            'company' => 'Acme Corp',
            'role' => 'Engineer',
            'status' => 'applied',
            'follow_up_at' => now()->toDateString(),
        ]);

        $this->artisan('app:send-followup-reminders')->assertSuccessful();

        Mail::assertQueued(FollowUpReminderMail::class, function ($mail) use ($user) {
            return $mail->hasTo($user->email);
        });
    }

    public function test_command_does_not_send_for_future_followups(): void
    {
        Mail::fake();

        $user = User::factory()->create();
        JobApplication::factory()->create([
            'user_id' => $user->id,
            'follow_up_at' => now()->addDay()->toDateString(),
        ]);

        $this->artisan('app:send-followup-reminders')->assertSuccessful();

        Mail::assertNothingQueued();
    }

    public function test_command_does_not_send_for_past_followups(): void
    {
        Mail::fake();

        $user = User::factory()->create();
        JobApplication::factory()->create([
            'user_id' => $user->id,
            'follow_up_at' => now()->subDay()->toDateString(),
        ]);

        $this->artisan('app:send-followup-reminders')->assertSuccessful();

        Mail::assertNothingQueued();
    }

    public function test_command_does_not_send_when_no_follow_up_date(): void
    {
        Mail::fake();

        $user = User::factory()->create();
        JobApplication::factory()->create([
            'user_id' => $user->id,
            'follow_up_at' => null,
        ]);

        $this->artisan('app:send-followup-reminders')->assertSuccessful();

        Mail::assertNothingQueued();
    }

    public function test_sends_one_mail_per_application_not_per_user(): void
    {
        Mail::fake();

        $user = User::factory()->create();
        JobApplication::factory()->count(3)->create([
            'user_id' => $user->id,
            'follow_up_at' => now()->toDateString(),
        ]);

        $this->artisan('app:send-followup-reminders')->assertSuccessful();

        Mail::assertQueuedCount(3);
    }
}
