<?php

namespace App\Mail;

use App\Models\JobListing;
use App\Models\JobSearch;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Collection;

class JobMatchesDigestMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /**
     * @param  Collection<int, JobListing>  $listings
     */
    public function __construct(
        public User $user,
        public JobSearch $search,
        public Collection $listings,
    ) {}

    public function envelope(): Envelope
    {
        $count = $this->listings->count();

        return new Envelope(
            subject: $count === 1
                ? "1 new opening for {$this->search->label}"
                : "{$count} new openings for {$this->search->label}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.job-matches-digest',
            with: [
                'userName' => $this->user->name,
                'searchLabel' => $this->search->label,
                'jobsUrl' => route('jobs.index'),
                'listings' => $this->listings->map(fn ($listing): array => [
                    'title' => $listing->title,
                    'company' => $listing->company,
                    'location' => $listing->location,
                    'url' => $listing->url,
                    'score' => $listing->fit_score,
                    'reason' => $listing->fit_reason,
                ])->all(),
            ],
        );
    }
}
