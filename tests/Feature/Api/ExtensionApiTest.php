<?php

namespace Tests\Feature\Api;

use App\Models\Education;
use App\Models\Experience;
use App\Models\JobListing;
use App\Models\JobPoolEntry;
use App\Models\QaBankEntry;
use App\Models\Resume;
use App\Models\ResumeGroup;
use App\Models\Skill;
use App\Models\StarterProfile;
use App\Models\User;
use App\Services\AiCreditService;
use App\Support\ResumeFillProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use OpenAI\Laravel\Facades\OpenAI;
use OpenAI\Responses\Chat\CreateResponse;
use Tests\Concerns\CreatesCashierSubscription;

class ExtensionApiTest extends ApiTestCase
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

    public function test_extension_me_requires_token(): void
    {
        $this->getJson('/api/extension/me')->assertUnauthorized();
    }

    public function test_extension_me_returns_user_with_extension_token(): void
    {
        $user = User::factory()->create([
            'name' => 'Jane Doe',
            'email' => 'jane@example.com',
        ]);
        $token = $user->createToken(
            ResumeFillProfile::TOKEN_NAME,
            [ResumeFillProfile::TOKEN_ABILITY]
        )->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/extension/me')
            ->assertOk()
            ->assertJson([
                'name' => 'Jane Doe',
                'email' => 'jane@example.com',
            ]);
    }

    public function test_token_without_extension_ability_is_forbidden(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('other', ['something-else'])->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/extension/me')
            ->assertForbidden();
    }

    public function test_resumes_list_groups_and_versions(): void
    {
        $user = User::factory()->create();
        $group = ResumeGroup::factory()->for($user)->create(['title' => 'PM track']);
        $older = Resume::factory()->for($user)->create([
            'group_id' => $group->id,
            'title' => 'v old',
            'full_name' => 'Jane Doe',
        ]);
        // Ensure newer updated_at for ordering assertions.
        $this->travel(1)->minutes();
        $newer = Resume::factory()->for($user)->create([
            'group_id' => $group->id,
            'title' => 'v new',
            'full_name' => 'Jane Doe',
        ]);

        $token = $user->createToken(
            ResumeFillProfile::TOKEN_NAME,
            [ResumeFillProfile::TOKEN_ABILITY]
        )->plainTextToken;

        $response = $this->withToken($token)
            ->getJson('/api/extension/resumes')
            ->assertOk();

        $response->assertJsonPath('user.email', $user->email);
        $response->assertJsonPath('groups.0.title', 'PM track');
        $response->assertJsonPath('groups.0.versions.0.id', $newer->id);
        $response->assertJsonPath('groups.0.versions.0.version_label', 'v2');
        $response->assertJsonPath('groups.0.versions.1.id', $older->id);
        $response->assertJsonPath('groups.0.versions.1.version_label', 'v1');
    }

    public function test_fill_profile_returns_contact_inserts_and_latest_role(): void
    {
        $user = User::factory()->create();
        $group = ResumeGroup::factory()->for($user)->create(['title' => 'Design']);
        $resume = Resume::factory()->for($user)->create([
            'group_id' => $group->id,
            'title' => 'Product Design',
            'full_name' => 'Maya Chen',
            'email' => 'maya@example.com',
            'phone' => '555-0100',
            'location' => 'Austin, TX',
            'linkedin' => 'https://linkedin.com/in/maya',
            'website' => 'https://maya.design',
            'summary' => 'Designer with impact.',
            'target_role' => 'Product Design',
        ]);

        Experience::factory()->for($resume)->create([
            'position' => 0,
            'title' => 'Senior PM',
            'company' => 'Acme',
            'start_date' => '2022',
            'end_date' => '',
            'is_current' => true,
            'bullets' => ['Shipped X', 'Grew Y'],
        ]);
        Skill::factory()->for($resume)->create(['position' => 0, 'name' => 'Roadmaps']);
        Skill::factory()->for($resume)->create(['position' => 1, 'name' => 'Figma']);
        Education::factory()->for($resume)->create([
            'position' => 0,
            'school' => 'State U',
            'degree' => 'B.A.',
            'field' => 'Design',
            'graduation_year' => '2014',
        ]);

        $token = $user->createToken(
            ResumeFillProfile::TOKEN_NAME,
            [ResumeFillProfile::TOKEN_ABILITY]
        )->plainTextToken;

        $this->withToken($token)
            ->getJson("/api/extension/resumes/{$resume->id}/fill-profile")
            ->assertOk()
            ->assertJsonPath('contact.full_name', 'Maya Chen')
            ->assertJsonPath('contact.first_name', 'Maya')
            ->assertJsonPath('contact.last_name', 'Chen')
            ->assertJsonPath('contact.email', 'maya@example.com')
            ->assertJsonPath('skills_csv', 'Roadmaps, Figma')
            ->assertJsonPath('latest_role.one_liner', 'Senior PM at Acme · 2022–Present')
            ->assertJsonPath('inserts.latest_role_bullets', "• Shipped X\n• Grew Y")
            ->assertJsonPath('education.school', 'State U')
            ->assertJsonPath('group_title', 'Design')
            ->assertJsonPath('version_label', 'v1');
    }

    public function test_fill_profile_hides_other_users_resumes(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $resume = Resume::factory()->for($owner)->create();

        $token = $intruder->createToken(
            ResumeFillProfile::TOKEN_NAME,
            [ResumeFillProfile::TOKEN_ABILITY]
        )->plainTextToken;

        $this->withToken($token)
            ->getJson("/api/extension/resumes/{$resume->id}/fill-profile")
            ->assertNotFound();
    }

    public function test_qa_bank_lists_the_users_entries(): void
    {
        $user = User::factory()->create();
        $profile = StarterProfile::factory()->for($user)->create();
        QaBankEntry::factory()->for($profile)->create(['question' => 'Why this role?', 'answer' => 'Because.']);

        $token = $user->createToken(
            ResumeFillProfile::TOKEN_NAME,
            [ResumeFillProfile::TOKEN_ABILITY]
        )->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/extension/qa-bank')
            ->assertOk()
            ->assertJsonPath('entries.0.question', 'Why this role?')
            ->assertJsonPath('entries.0.answer', 'Because.');
    }

    public function test_qa_bank_match_finds_a_near_duplicate_question(): void
    {
        $user = User::factory()->create();
        $profile = StarterProfile::factory()->for($user)->create();
        QaBankEntry::factory()->for($profile)->create([
            'question' => 'Why do you want to work here?',
            'answer' => 'Because of the mission.',
        ]);

        $token = $user->createToken(
            ResumeFillProfile::TOKEN_NAME,
            [ResumeFillProfile::TOKEN_ABILITY]
        )->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/extension/qa-bank/match?'.http_build_query(['question' => 'Why do you want to work here']))
            ->assertOk()
            ->assertJsonPath('match.answer', 'Because of the mission.');
    }

    public function test_qa_bank_match_returns_null_for_no_match(): void
    {
        $user = User::factory()->create();
        $profile = StarterProfile::factory()->for($user)->create();
        QaBankEntry::factory()->for($profile)->create(['question' => 'What is your greatest strength?']);

        $token = $user->createToken(
            ResumeFillProfile::TOKEN_NAME,
            [ResumeFillProfile::TOKEN_ABILITY]
        )->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/extension/qa-bank/match?'.http_build_query(['question' => 'Describe a time you resolved a supply chain outage']))
            ->assertOk()
            ->assertJsonPath('match', null);
    }

    public function test_qa_bank_match_is_scoped_to_the_tokens_own_user(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $profile = StarterProfile::factory()->for($owner)->create();
        QaBankEntry::factory()->for($profile)->create([
            'question' => 'Why do you want to work here?',
            'answer' => 'Owner secret answer.',
        ]);

        $token = $intruder->createToken(
            ResumeFillProfile::TOKEN_NAME,
            [ResumeFillProfile::TOKEN_ABILITY]
        )->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/extension/qa-bank/match?'.http_build_query(['question' => 'Why do you want to work here?']))
            ->assertOk()
            ->assertJsonPath('match', null);
    }

    public function test_qa_bank_store_creates_an_entry_via_extension_token(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken(
            ResumeFillProfile::TOKEN_NAME,
            [ResumeFillProfile::TOKEN_ABILITY]
        )->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/extension/qa-bank', [
                'question' => 'Why do you want to work here?',
                'answer' => 'Because of the mission.',
            ])
            ->assertCreated()
            ->assertJsonPath('question', 'Why do you want to work here?')
            ->assertJsonPath('answer', 'Because of the mission.');

        $this->assertDatabaseHas('qa_bank_entries', [
            'question' => 'Why do you want to work here?',
            'answer' => 'Because of the mission.',
        ]);
    }

    public function test_qa_bank_draft_returns_a_bank_match_without_spending_a_credit(): void
    {
        $user = $this->subscribedUserWithCredits(5);
        $profile = StarterProfile::factory()->for($user)->create();
        $resume = Resume::factory()->for($user)->create();
        QaBankEntry::factory()->for($profile)->create([
            'question' => 'Why do you want to work here?',
            'answer' => 'Because of the mission.',
        ]);

        $token = $user->createToken(
            ResumeFillProfile::TOKEN_NAME,
            [ResumeFillProfile::TOKEN_ABILITY]
        )->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/extension/qa-bank/draft', [
                'question' => 'Why do you want to work here',
                'resume_id' => $resume->id,
            ])
            ->assertOk()
            ->assertJsonPath('answer', 'Because of the mission.')
            ->assertJsonPath('source', 'qa_bank')
            ->assertJsonPath('cost', null);

        $this->assertSame(5, app(AiCreditService::class)->balance($user));
    }

    public function test_qa_bank_draft_falls_back_to_ai_when_no_bank_match(): void
    {
        $user = $this->subscribedUserWithCredits(5);
        $resume = Resume::factory()->for($user)->create();

        OpenAI::fake([
            CreateResponse::fake([
                'choices' => [
                    ['message' => ['role' => 'assistant', 'content' => 'Because I love the mission.']],
                ],
                'usage' => ['prompt_tokens' => 30, 'completion_tokens' => 10],
            ]),
        ]);

        $token = $user->createToken(
            ResumeFillProfile::TOKEN_NAME,
            [ResumeFillProfile::TOKEN_ABILITY]
        )->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/extension/qa-bank/draft', [
                'question' => 'Describe a time you resolved a supply chain outage',
                'resume_id' => $resume->id,
            ])
            ->assertOk()
            ->assertJsonPath('answer', 'Because I love the mission.')
            ->assertJsonPath('source', 'ai')
            ->assertJsonPath('cost', 1);

        $this->assertSame(4, app(AiCreditService::class)->balance($user));
    }

    public function test_qa_bank_draft_requires_subscription(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $token = $user->createToken(
            ResumeFillProfile::TOKEN_NAME,
            [ResumeFillProfile::TOKEN_ABILITY]
        )->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/extension/qa-bank/draft', [
                'question' => 'Describe a time you resolved a supply chain outage',
                'resume_id' => $resume->id,
            ])
            ->assertStatus(402)
            ->assertJson(['message' => 'Subscription or AI credits required.']);
    }

    public function test_qa_bank_draft_blocks_ai_blocked_user(): void
    {
        $user = $this->subscribedUserWithCredits();
        $user->forceFill(['ai_blocked' => true])->save();
        $resume = Resume::factory()->for($user)->create();
        $token = $user->createToken(
            ResumeFillProfile::TOKEN_NAME,
            [ResumeFillProfile::TOKEN_ABILITY]
        )->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/extension/qa-bank/draft', [
                'question' => 'Describe a time you resolved a supply chain outage',
                'resume_id' => $resume->id,
            ])
            ->assertStatus(429);
    }

    public function test_qa_bank_draft_scoped_to_own_resume(): void
    {
        $user = $this->subscribedUserWithCredits();
        $intruder = User::factory()->create();
        $resume = Resume::factory()->for($intruder)->create();
        $token = $user->createToken(
            ResumeFillProfile::TOKEN_NAME,
            [ResumeFillProfile::TOKEN_ABILITY]
        )->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/extension/qa-bank/draft', [
                'question' => 'Describe a time you resolved a supply chain outage',
                'resume_id' => $resume->id,
            ])
            ->assertNotFound();
    }

    public function test_job_application_store_creates_a_saved_application(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken(
            ResumeFillProfile::TOKEN_NAME,
            [ResumeFillProfile::TOKEN_ABILITY]
        )->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/extension/job-applications', [
                'company' => 'Acme Corp',
                'role' => 'Senior Engineer',
                'job_url' => 'https://example.com/jobs/1',
                'job_description' => 'Build reliable services.',
            ])
            ->assertCreated()
            ->assertJsonPath('company', 'Acme Corp')
            ->assertJsonPath('status', 'saved');

        $this->assertDatabaseHas('job_applications', [
            'user_id' => $user->id,
            'company' => 'Acme Corp',
            'status' => 'saved',
            'job_description' => 'Build reliable services.',
        ]);
        $this->assertDatabaseHas('job_application_status_events', [
            'from_status' => null,
            'to_status' => 'saved',
        ]);
    }

    public function test_job_application_store_requires_company_and_role(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken(
            ResumeFillProfile::TOKEN_NAME,
            [ResumeFillProfile::TOKEN_ABILITY]
        )->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/extension/job-applications', [])
            ->assertStatus(422);
    }

    public function test_job_application_store_with_base_resume_creates_tailored_version(): void
    {
        $user = User::factory()->create();
        $base = Resume::factory()->for($user)->create(['title' => 'Base']);
        $token = $user->createToken(
            ResumeFillProfile::TOKEN_NAME,
            [ResumeFillProfile::TOKEN_ABILITY]
        )->plainTextToken;

        $response = $this->withToken($token)
            ->postJson('/api/extension/job-applications', [
                'company' => 'Acme Corp',
                'role' => 'Senior Engineer',
                'base_resume_id' => $base->id,
                'job_description' => 'Go and Kubernetes.',
            ])
            ->assertCreated();

        $versionId = $response->json('resume_id');
        $this->assertNotNull($versionId);
        $this->assertNotSame($base->id, $versionId);
        $this->assertDatabaseHas('resumes', [
            'id' => $versionId,
            'group_id' => $base->group_id,
            'title' => 'Acme Corp – Senior Engineer',
            'target_job_description' => 'Go and Kubernetes.',
        ]);
    }

    public function test_target_job_description_update_persists_and_is_owner_scoped(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create(['target_job_description' => '']);
        $token = $user->createToken(
            ResumeFillProfile::TOKEN_NAME,
            [ResumeFillProfile::TOKEN_ABILITY]
        )->plainTextToken;

        $this->withToken($token)
            ->patchJson("/api/extension/resumes/{$resume->id}/target-job-description", [
                'target_job_description' => 'We need a senior engineer with Laravel experience.',
            ])
            ->assertOk()
            ->assertJson(['ok' => true]);

        $this->assertDatabaseHas('resumes', [
            'id' => $resume->id,
            'target_job_description' => 'We need a senior engineer with Laravel experience.',
        ]);
    }

    public function test_target_job_description_update_is_scoped_to_owner(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $resume = Resume::factory()->for($owner)->create();
        $token = $intruder->createToken(
            ResumeFillProfile::TOKEN_NAME,
            [ResumeFillProfile::TOKEN_ABILITY]
        )->plainTextToken;

        $this->withToken($token)
            ->patchJson("/api/extension/resumes/{$resume->id}/target-job-description", [
                'target_job_description' => 'Hijacked.',
            ])
            ->assertNotFound();
    }

    public function test_extension_pdf_streams_for_the_owner(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create(['title' => 'My Resume']);
        $token = $user->createToken(
            ResumeFillProfile::TOKEN_NAME,
            [ResumeFillProfile::TOKEN_ABILITY]
        )->plainTextToken;

        $this->withToken($token)
            ->get("/api/extension/resumes/{$resume->id}/pdf")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }

    public function test_extension_pdf_hides_other_users_resumes(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $resume = Resume::factory()->for($owner)->create();
        $token = $intruder->createToken(
            ResumeFillProfile::TOKEN_NAME,
            [ResumeFillProfile::TOKEN_ABILITY]
        )->plainTextToken;

        $this->withToken($token)
            ->get("/api/extension/resumes/{$resume->id}/pdf")
            ->assertNotFound();
    }

    public function test_disabled_user_is_rejected(): void
    {
        $user = User::factory()->create(['disabled_at' => now()]);
        $token = $user->createToken(
            ResumeFillProfile::TOKEN_NAME,
            [ResumeFillProfile::TOKEN_ABILITY]
        )->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/extension/me')
            ->assertForbidden();
    }

    public function test_job_pool_returns_the_users_pool_entries(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $listing = JobListing::factory()->create();
        JobPoolEntry::factory()->create([
            'user_id' => $user->id,
            'job_listing_id' => $listing->id,
            'resume_id' => $resume->id,
        ]);
        $token = $user->createToken(
            ResumeFillProfile::TOKEN_NAME,
            [ResumeFillProfile::TOKEN_ABILITY]
        )->plainTextToken;

        $response = $this->withToken($token)->getJson('/api/extension/job-pool');

        $response->assertOk();
        $response->assertJsonCount(1, 'entries');
        $response->assertJsonFragment(['title' => $listing->title]);
    }

    public function test_job_pool_does_not_leak_other_users_entries(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $otherResume = Resume::factory()->for($other)->create();
        $listing = JobListing::factory()->create();
        JobPoolEntry::factory()->create([
            'user_id' => $other->id,
            'job_listing_id' => $listing->id,
            'resume_id' => $otherResume->id,
        ]);
        $token = $user->createToken(
            ResumeFillProfile::TOKEN_NAME,
            [ResumeFillProfile::TOKEN_ABILITY]
        )->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/extension/job-pool')
            ->assertOk()
            ->assertJsonCount(0, 'entries');
    }

    public function test_job_pool_requires_extension_ability(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('limited', ['some-other-ability'])->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/extension/job-pool')
            ->assertForbidden();
    }
}
