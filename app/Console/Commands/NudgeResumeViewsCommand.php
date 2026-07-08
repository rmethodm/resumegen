<?php

namespace App\Console\Commands;

use App\Mail\ResumeViewNudgeMail;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class NudgeResumeViewsCommand extends Command
{
    protected $signature = 'resumes:nudge-views';

    protected $description = 'Send free-tier users a weekly nudge when their shared resume gets new views';

    public function handle(): int
    {
        $lookback = now()->subDays(7);

        User::whereHas('resumes.shareEvents', function ($q) use ($lookback) {
            $q->where('event', 'page_view')->where('created_at', '>=', $lookback);
        })
            ->with(['resumes.shareEvents', 'resumes.sectionEvents'])
            ->each(function (User $user) use ($lookback) {
                if ($user->isAtLeastStarter()) {
                    return;
                }

                $cutoff = $user->view_nudge_sent_at?->greaterThan($lookback)
                    ? $user->view_nudge_sent_at
                    : $lookback;

                $viewEvents = $user->resumes->flatMap->shareEvents
                    ->where('event', 'page_view')
                    ->filter(fn ($event) => $event->created_at->greaterThan($cutoff));

                if ($viewEvents->isEmpty()) {
                    return;
                }

                $topSection = $user->resumes->flatMap->sectionEvents
                    ->groupBy('section')
                    ->map(fn ($events) => $events->sum('dwell_ms'))
                    ->sortDesc()
                    ->keys()
                    ->first();

                Mail::to($user->email)->queue(new ResumeViewNudgeMail($user, $viewEvents->count(), $topSection));

                $user->update(['view_nudge_sent_at' => now()]);
            });

        return self::SUCCESS;
    }
}
