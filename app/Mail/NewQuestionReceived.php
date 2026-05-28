<?php

namespace App\Mail;

use App\Models\Resume;
use App\Models\ResumeQuestion;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class NewQuestionReceived extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly ResumeQuestion $question,
        public readonly Resume $resume,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "New message on your resume \"{$this->resume->name}\"",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.new-question',
        );
    }
}
