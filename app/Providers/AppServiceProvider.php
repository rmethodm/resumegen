<?php

namespace App\Providers;

use App\Models\SystemEvent;
use Illuminate\Mail\Events\MessageSent;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        // Delivery log: record outbound mail (best-effort).
        Event::listen(MessageSent::class, function (MessageSent $event): void {
            try {
                $email = $event->message; // Symfony\Component\Mime\Email
                $to = collect($email->getTo())->map->getAddress()->implode(', ');
                SystemEvent::record('mail', $email->getSubject() ?: '(no subject)', 'sent', $to ?: null);
            } catch (\Throwable) {
            }
        });
    }
}
