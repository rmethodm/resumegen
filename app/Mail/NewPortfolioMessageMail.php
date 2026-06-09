<?php

namespace App\Mail;

use App\Models\PortfolioMessage;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class NewPortfolioMessageMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly User $owner,
        public readonly PortfolioMessage $message,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "New message from {$this->message->sender_name} via your portfolio",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.new-portfolio-message',
        );
    }
}
