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

class NewVisitorReply extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly ResumeThread $thread,
        public readonly ResumeThreadMessage $newMessage,
        public readonly Resume $resume,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "{$this->thread->sender_name} replied to your conversation",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.new-visitor-reply',
        );
    }
}
