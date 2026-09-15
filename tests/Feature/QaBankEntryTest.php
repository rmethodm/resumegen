<?php

namespace Tests\Feature;

use App\Models\QaBankEntry;
use App\Models\StarterProfile;
use App\Models\User;
use App\Services\AiCreditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use OpenAI\Laravel\Facades\OpenAI;
use OpenAI\Responses\Chat\CreateResponse;
use Tests\Concerns\CreatesCashierSubscription;
use Tests\TestCase;

class QaBankEntryTest extends TestCase
{
    use CreatesCashierSubscription;
    use RefreshDatabase;

    private function subscribedUserWithCredits(int $credits = 5): User
    {
        $user = User::factory()->create();
        $this->subscribeUser($user);
        app(AiCreditService::class)->grant($user, $credits, 'admin');

        return $user;
    }

    public function test_storing_an_entry_creates_the_starter_profile_when_missing(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('qa-bank-entries.store'), ['question' => 'Why do you want this role?'])
            ->assertRedirect();

        $this->assertDatabaseHas('starter_profiles', ['user_id' => $user->id]);
        $this->assertDatabaseHas('qa_bank_entries', [
            'question' => 'Why do you want this role?',
            'position' => 1,
        ]);
    }

    public function test_entries_increment_position(): void
    {
        $user = User::factory()->create();
        $profile = StarterProfile::factory()->for($user)->create();
        QaBankEntry::factory()->for($profile)->create(['position' => 1]);

        $this->actingAs($user)
            ->post(route('qa-bank-entries.store'), ['question' => 'Second question?']);

        $this->assertDatabaseHas('qa_bank_entries', ['question' => 'Second question?', 'position' => 2]);
    }

    public function test_owner_can_update_and_delete_an_entry(): void
    {
        $user = User::factory()->create();
        $profile = StarterProfile::factory()->for($user)->create();
        $entry = QaBankEntry::factory()->for($profile)->create();

        $this->actingAs($user)
            ->patch(route('qa-bank-entries.update', $entry), ['answer' => 'Because of the mission.'])
            ->assertRedirect();

        $this->assertDatabaseHas('qa_bank_entries', ['id' => $entry->id, 'answer' => 'Because of the mission.']);

        $this->actingAs($user)
            ->delete(route('qa-bank-entries.destroy', $entry))
            ->assertRedirect();

        $this->assertDatabaseMissing('qa_bank_entries', ['id' => $entry->id]);
    }

    public function test_non_owner_cannot_update_or_delete_an_entry(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $profile = StarterProfile::factory()->for($owner)->create();
        $entry = QaBankEntry::factory()->for($profile)->create();

        $this->actingAs($intruder)
            ->patch(route('qa-bank-entries.update', $entry), ['answer' => 'x'])
            ->assertNotFound();

        $this->actingAs($intruder)
            ->delete(route('qa-bank-entries.destroy', $entry))
            ->assertNotFound();
    }

    public function test_unsubscribed_user_cannot_draft_an_answer(): void
    {
        $user = User::factory()->create();
        $profile = StarterProfile::factory()->for($user)->create();
        $entry = QaBankEntry::factory()->for($profile)->create();

        $this->actingAs($user)
            ->postJson(route('qa-bank-entries.draft', $entry))
            ->assertStatus(402)
            ->assertJson(['message' => 'Subscription or AI credits required.']);
    }

    public function test_ai_blocked_user_cannot_draft_an_answer(): void
    {
        $user = $this->subscribedUserWithCredits();
        $user->forceFill(['ai_blocked' => true])->save();
        $profile = StarterProfile::factory()->for($user)->create();
        $entry = QaBankEntry::factory()->for($profile)->create();

        $this->actingAs($user)
            ->postJson(route('qa-bank-entries.draft', $entry))
            ->assertStatus(429);
    }

    public function test_drafting_an_answer_spends_a_credit_and_does_not_autosave(): void
    {
        $user = $this->subscribedUserWithCredits(5);
        $profile = StarterProfile::factory()->for($user)->create(['full_name' => 'Ada Lovelace']);
        $entry = QaBankEntry::factory()->for($profile)->create(['question' => 'Why this role?', 'answer' => null]);

        OpenAI::fake([
            CreateResponse::fake([
                'choices' => [
                    ['message' => ['role' => 'assistant', 'content' => 'Because I love the mission.']],
                ],
                'usage' => ['prompt_tokens' => 30, 'completion_tokens' => 10],
            ]),
        ]);

        $response = $this->actingAs($user)->postJson(route('qa-bank-entries.draft', $entry));

        $response->assertOk()->assertJson(['draft' => 'Because I love the mission.']);
        $this->assertSame(4, app(AiCreditService::class)->balance($user));
        $this->assertDatabaseHas('qa_bank_entries', ['id' => $entry->id, 'answer' => null]);
    }

    public function test_non_owner_cannot_draft_an_answer(): void
    {
        $owner = $this->subscribedUserWithCredits();
        $intruder = User::factory()->create();
        $profile = StarterProfile::factory()->for($owner)->create();
        $entry = QaBankEntry::factory()->for($profile)->create();

        $this->actingAs($intruder)
            ->postJson(route('qa-bank-entries.draft', $entry))
            ->assertNotFound();
    }
}
