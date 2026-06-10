<?php

namespace App\Console\Commands;

use App\Mail\StaleResumeNudgeMail;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class NudgeStaleResumesCommand extends Command
{
    protected $signature = 'resumes:nudge-stale';

    protected $description = 'Send re-engagement emails for resumes not updated in 30+ days';

    public function handle(): int
    {
        $cutoff = now()->subDays(30);
        $nudgeCooloff = now()->subDays(7);

        User::whereHas('resumes', function ($q) use ($cutoff) {
            $q->where('updated_at', '<', $cutoff)->nonSnapshot();
        })
            ->where(function ($q) use ($nudgeCooloff) {
                $q->whereNull('stale_nudge_sent_at')
                    ->orWhere('stale_nudge_sent_at', '<', $nudgeCooloff);
            })
            ->each(function (User $user) use ($cutoff) {
                $staleResume = $user->resumes()
                    ->where('updated_at', '<', $cutoff)
                    ->nonSnapshot()
                    ->latest('updated_at')
                    ->first();

                if (! $staleResume) {
                    return;
                }

                $days = (int) now()->diffInDays($staleResume->updated_at);

                Mail::to($user->email)->queue(new StaleResumeNudgeMail($user, $staleResume, $days));

                $user->update(['stale_nudge_sent_at' => now()]);
            });

        return self::SUCCESS;
    }
}
