<?php

namespace App\Mail;

use App\Models\JobApplication;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class FollowUpReminderMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly JobApplication $application,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Follow up on your application to {$this->application->company}",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.follow-up-reminder',
        );
    }
}
