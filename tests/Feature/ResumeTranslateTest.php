<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use OpenAI\Contracts\ClientContract;
use OpenAI\Responses\Chat\CreateResponse;
use OpenAI\Responses\Moderations\CreateResponse as ModerationResponse;
use OpenAI\Testing\ClientFake;
use Tests\TestCase;

class ResumeTranslateTest extends TestCase
{
    use RefreshDatabase;

    private function fakeReply(string $content): void
    {
        $this->app->instance(ClientContract::class, new ClientFake([
            ModerationResponse::fake(['results' => [['flagged' => false]]]),
            CreateResponse::fake([
                'model' => 'gpt-4o-mini',
                'choices' => [['index' => 0, 'message' => ['role' => 'assistant', 'content' => $content]]],
                'usage' => ['prompt_tokens' => 5, 'completion_tokens' => 5, 'total_tokens' => 10],
            ]),
        ]));
    }

    private function fakeServiceFailure(): void
    {
        $this->app->instance(ClientContract::class, new ClientFake([
            ModerationResponse::fake(['results' => [['flagged' => false]]]),
            new \Exception('Simulated OpenAI outage'),
        ]));
    }

    public function test_free_user_gets_402(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->postJson(route('builder.ai.translate', $resume), [
            'language' => 'spanish',
        ])->assertStatus(402)->assertJson(['required_tier' => 'starter']);
    }

    public function test_starter_user_at_resume_limit_gets_402(): void
    {
        $user = User::factory()->starter()->create();
        Resume::factory()->count(10)->create(['user_id' => $user->id]);
        $resume = $user->resumes()->first();

        $this->actingAs($user)->postJson(route('builder.ai.translate', $resume), [
            'language' => 'spanish',
        ])->assertStatus(402)->assertJson(['required_tier' => 'pro']);
    }

    public function test_starter_user_can_translate_and_creates_new_resume(): void
    {
        $translated = json_encode([
            'summary' => 'Ingeniero backend senior.',
            'experience' => [],
            'education' => [],
            'skills' => ['PHP', 'Laravel'],
            'skills_groups' => [],
            'skill_narratives' => [],
            'custom_sections' => [],
        ]);
        $this->fakeReply($translated);

        $user = User::factory()->starter()->create();
        $resume = Resume::factory()->for($user)->create([
            'name' => 'My Resume',
            'summary' => 'Senior backend engineer.',
            'skills' => ['PHP', 'Laravel'],
            'contact' => ['email' => 'me@example.com'],
            'template' => 'classic',
        ]);

        $res = $this->actingAs($user)->postJson(route('builder.ai.translate', $resume), [
            'language' => 'spanish',
        ]);

        $res->assertOk()->assertJsonStructure(['resume_id', 'remaining']);

        $copy = Resume::find($res->json('resume_id'));
        $this->assertNotNull($copy);
        $this->assertNotEquals($resume->id, $copy->id);
        $this->assertSame('Ingeniero backend senior.', $copy->summary);
        $this->assertSame(['PHP', 'Laravel'], $copy->skills);
        // Untouched structural fields carried over unchanged from the original.
        $this->assertSame($resume->contact, $copy->contact);
        $this->assertSame($resume->template, $copy->template);
    }

    public function test_free_tier_cannot_translate_even_under_resume_limit(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->postJson(route('builder.ai.translate', $resume), [
            'language' => 'french',
        ])->assertStatus(402)->assertJson(['required_tier' => 'starter']);
    }

    public function test_ai_quota_exhausted_returns_402(): void
    {
        config()->set('ai.monthly_limits.starter', 0);
        $user = User::factory()->starter()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->postJson(route('builder.ai.translate', $resume), [
            'language' => 'spanish',
        ])->assertStatus(402);
    }

    public function test_moderation_rejection_returns_422(): void
    {
        $this->app->instance(ClientContract::class, new ClientFake([
            ModerationResponse::fake(['results' => [['flagged' => true]]]),
        ]));
        $user = User::factory()->starter()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->postJson(route('builder.ai.translate', $resume), [
            'language' => 'spanish',
        ])->assertStatus(422);

        $this->assertSame(1, Resume::count());
    }

    public function test_ai_service_failure_returns_503_and_creates_no_copy(): void
    {
        $this->fakeServiceFailure();
        $user = User::factory()->starter()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->postJson(route('builder.ai.translate', $resume), [
            'language' => 'spanish',
        ])->assertStatus(503);

        $this->assertSame(1, Resume::count());
    }

    public function test_malformed_json_reply_returns_503_and_creates_no_copy(): void
    {
        $this->fakeReply('not valid json');
        $user = User::factory()->starter()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->postJson(route('builder.ai.translate', $resume), [
            'language' => 'spanish',
        ])->assertStatus(503);

        $this->assertSame(1, Resume::count());
    }

    public function test_mismatched_shape_reply_returns_503_and_creates_no_copy(): void
    {
        $this->fakeReply(json_encode(['summary' => 'Only summary, missing other keys.']));
        $user = User::factory()->starter()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->postJson(route('builder.ai.translate', $resume), [
            'language' => 'spanish',
        ])->assertStatus(503);

        $this->assertSame(1, Resume::count());
    }

    public function test_invalid_language_is_rejected(): void
    {
        $user = User::factory()->starter()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->postJson(route('builder.ai.translate', $resume), [
            'language' => 'klingon',
        ])->assertStatus(422);
    }

    public function test_other_user_cannot_translate(): void
    {
        $owner = User::factory()->starter()->create();
        $other = User::factory()->starter()->create();
        $resume = Resume::factory()->for($owner)->create();

        $this->actingAs($other)->postJson(route('builder.ai.translate', $resume), [
            'language' => 'spanish',
        ])->assertForbidden();
    }
}
