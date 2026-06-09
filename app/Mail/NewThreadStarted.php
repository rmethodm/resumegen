<?php

namespace App\Mail;

use App\Models\Resume;
use App\Models\ResumeThread;
use App\Models\ResumeThreadMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class NewThreadStarted extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly ResumeThread $thread,
        public readonly ResumeThreadMessage $firstMessage,
        public readonly Resume $resume,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "New message from {$this->thread->sender_name} on your resume",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.new-thread-started',
        );
    }
}
