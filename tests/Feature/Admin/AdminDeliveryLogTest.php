<?php

namespace Tests\Feature\Admin;

use App\Models\SystemEvent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia;
use Laravel\Cashier\Events\WebhookReceived;
use Tests\TestCase;

class AdminDeliveryLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_record_writes_a_row(): void
    {
        SystemEvent::record('mail', 'Welcome', 'sent', 'a@b.com', ['mailer' => 'array']);

        $this->assertDatabaseHas('system_events', [
            'channel' => 'mail',
            'type' => 'Welcome',
            'status' => 'sent',
            'recipient' => 'a@b.com',
        ]);
    }

    public function test_stripe_webhook_is_logged(): void
    {
        event(new WebhookReceived(['type' => 'invoice.paid', 'id' => 'evt_1']));

        $this->assertDatabaseHas('system_events', [
            'channel' => 'stripe_webhook',
            'type' => 'invoice.paid',
            'status' => 'received',
        ]);
    }

    public function test_outbound_mail_is_logged(): void
    {
        config(['mail.default' => 'array']);

        Mail::raw('hello there', function ($message) {
            $message->to('recipient@example.com')->subject('Hello');
        });

        $this->assertDatabaseHas('system_events', [
            'channel' => 'mail',
            'type' => 'Hello',
            'status' => 'sent',
            'recipient' => 'recipient@example.com',
        ]);
    }

    public function test_prune_deletes_old_events(): void
    {
        $old = SystemEvent::factory()->create();
        $old->forceFill(['created_at' => now()->subDays(40)])->save();
        $recent = SystemEvent::factory()->create();

        $this->artisan('system-events:prune', ['--days' => 30])->assertExitCode(0);

        $this->assertDatabaseMissing('system_events', ['id' => $old->id]);
        $this->assertDatabaseHas('system_events', ['id' => $recent->id]);
    }

    public function test_ops_index_includes_recent_events(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        SystemEvent::factory()->create(['channel' => 'mail', 'type' => 'Welcome']);

        $this->actingAs($admin)->get(route('admin.ops.index'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->has('recentEvents', 1)
                ->where('recentEvents.0.type', 'Welcome')
            );
    }
}
