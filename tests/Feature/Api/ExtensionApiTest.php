<?php

namespace Tests\Feature\Api;

use App\Models\Education;
use App\Models\Experience;
use App\Models\QaBankEntry;
use App\Models\Resume;
use App\Models\ResumeGroup;
use App\Models\Skill;
use App\Models\StarterProfile;
use App\Models\User;
use App\Support\ResumeFillProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ExtensionApiTest extends ApiTestCase
{
    use RefreshDatabase;

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
}
