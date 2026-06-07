<?php

namespace App\Console\Commands;

use App\Mail\FollowUpReminderMail;
use App\Models\JobApplication;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SendFollowUpReminders extends Command
{
    protected $signature = 'app:send-followup-reminders';

    protected $description = 'Send follow-up reminder emails for job applications due today';

    public function handle(): int
    {
        $applications = JobApplication::with('user')
            ->whereDate('follow_up_at', today())
            ->get();

        foreach ($applications as $application) {
            Mail::to($application->user->email)
                ->queue(new FollowUpReminderMail($application));
        }

        $this->info("Sent {$applications->count()} follow-up reminder(s).");

        return self::SUCCESS;
    }
}
