<?php

namespace Tests\Feature;

use App\Models\AiRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Mail\Events\MessageSent;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class AiCostAlertTest extends TestCase
{
    use RefreshDatabase;

    /**
     * The alarm sums a column that recorded 0 for every OpenAI call, so it could not
     * fire no matter how much was spent. These two tests pin the threshold branch in
     * both directions — an alarm that never fires and an alarm that always fires are
     * equally useless, and only one of them is visible in production.
     *
     * Asserted on MessageSent, not Mail::fake(): the command sends via Mail::raw(),
     * and MailFake::raw() is a no-op, so every Mail::assert* call against it passes
     * vacuously whether or not the mail went out.
     */
    public function test_alert_fires_when_yesterdays_spend_exceeds_the_threshold(): void
    {
        Event::fake([MessageSent::class]);
        config()->set('ai.daily_alert_threshold_cents', 2);

        // 3 cents' worth, yesterday.
        AiRequest::factory()->count(3)->create([
            'estimated_cost_micro_cents' => 1_000_000,
            'created_at' => now()->subDay(),
        ]);

        $this->artisan('ai:cost-alert')->assertSuccessful();

        Event::assertDispatched(MessageSent::class);
    }

    public function test_alert_stays_silent_below_the_threshold(): void
    {
        Event::fake([MessageSent::class]);
        config()->set('ai.daily_alert_threshold_cents', 500);

        AiRequest::factory()->count(3)->create([
            'estimated_cost_micro_cents' => 1_000_000,
            'created_at' => now()->subDay(),
        ]);

        $this->artisan('ai:cost-alert')->assertSuccessful();

        Event::assertNotDispatched(MessageSent::class);
    }
}
