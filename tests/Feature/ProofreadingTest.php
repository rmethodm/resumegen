<?php

namespace Tests\Feature;

use App\Models\ProofreadingRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Laravel\Cashier\Events\WebhookReceived;
use Tests\TestCase;

class ProofreadingTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_lists_only_my_requests(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        ProofreadingRequest::factory()->for($me)->create();
        ProofreadingRequest::factory()->for($other)->create();

        $this->actingAs($me)
            ->get(route('proofreading.index'))
            ->assertOk()
            ->assertInertia(fn ($p) => $p->component('Proofreading/Index')->has('requests', 1));
    }

    public function test_store_fails_loudly_when_price_not_configured(): void
    {
        config(['services.stripe.proofreading_price_id' => null]);
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('proofreading.store'))
            ->assertStatus(500);
    }

    public function test_store_rejects_resume_owned_by_another_user(): void
    {
        config(['services.stripe.proofreading_price_id' => 'price_proofreading_test']);
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $resume = $owner->resumes()->create(['name' => 'Owner Resume', 'pdf_filename' => 'r.pdf']);

        $this->actingAs($other)
            ->post(route('proofreading.store'), ['resume_id' => $resume->id])
            ->assertForbidden();

        $this->assertDatabaseCount('proofreading_requests', 0);
    }

    public function test_webhook_marks_pending_request_paid_on_checkout_completed(): void
    {
        $user = User::factory()->create();
        $request = ProofreadingRequest::factory()->for($user)->create(['status' => 'pending']);

        Event::dispatch(new WebhookReceived([
            'id' => 'evt_test',
            'type' => 'checkout.session.completed',
            'data' => [
                'object' => [
                    'metadata' => ['proofreading_request_id' => (string) $request->id],
                ],
            ],
        ]));

        $this->assertDatabaseHas('proofreading_requests', ['id' => $request->id, 'status' => 'paid']);
    }

    public function test_webhook_ignores_unrelated_event_types(): void
    {
        $user = User::factory()->create();
        $request = ProofreadingRequest::factory()->for($user)->create(['status' => 'pending']);

        Event::dispatch(new WebhookReceived([
            'id' => 'evt_test',
            'type' => 'invoice.paid',
        ]));

        $this->assertDatabaseHas('proofreading_requests', ['id' => $request->id, 'status' => 'pending']);
    }
}
