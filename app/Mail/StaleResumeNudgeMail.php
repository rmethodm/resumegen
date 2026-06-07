<?php

namespace App\Mail;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class StaleResumeNudgeMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public Resume $resume,
        public int $daysSinceEdit,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Time to refresh your resume, {$this->user->name}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.stale-resume-nudge',
            with: [
                'userName' => $this->user->name,
                'resumeName' => $this->resume->name,
                'daysSinceEdit' => $this->daysSinceEdit,
                'editUrl' => route('builder.edit', $this->resume->id),
            ],
        );
    }
}
