<?php

namespace App\Mail;

use App\Models\Resume;
use App\Models\ResumeShareLink;
use App\Models\ResumeThread;
use App\Models\ResumeThreadMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class VisitorThreadReply extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly ResumeThread $thread,
        public readonly ResumeThreadMessage $ownerMessage,
        public readonly Resume $resume,
        public readonly ResumeShareLink $shareLink,
    ) {}

    public function envelope(): Envelope
    {
        $ownerName = $this->resume->contact['full_name'] ?? $this->resume->name;

        return new Envelope(
            subject: "{$ownerName} replied to your message",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.visitor-thread-reply',
        );
    }
}
