<?php

namespace App\Mail;

use App\Models\Organization;
use App\Models\OrganizationMember;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OrgInviteMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Organization $org,
        public readonly OrganizationMember $member,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "You've been invited to join {$this->org->name} on Resumegen",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.org-invite',
        );
    }
}
