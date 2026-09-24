<?php

namespace Tests\Feature;

use App\Models\StarterProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResumeCreatePathsTest extends TestCase
{
    use RefreshDatabase;

    public function test_create_from_role_sample_seeds_content(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('resumes.store'), [
            'sample' => 'software-engineer',
        ]);

        $resume = $user->resumes()->latest('id')->first();
        $this->assertNotNull($resume);
        $response->assertRedirect(route('resumes.workstation', $resume));

        $this->assertSame('Software Engineer', $resume->target_role);
        $this->assertGreaterThan(0, $resume->experiences()->count());
        $this->assertGreaterThan(0, $resume->skills()->count());
        $this->assertNotSame('', $resume->summary);
    }

    public function test_create_from_plain_text_import(): void
    {
        $user = User::factory()->create();

        $text = <<<'TXT'
Alex Rivera
Product Manager
alex@example.com

SUMMARY
PM with roadmap ownership.

EXPERIENCE
Product Manager — Cascade
• Owned discovery for core workflow

SKILLS
Roadmap, Discovery, Metrics
TXT;

        $response = $this->actingAs($user)->post(route('resumes.store'), [
            'plain_text' => $text,
        ]);

        $resume = $user->resumes()->latest('id')->first();
        $this->assertNotNull($resume);
        $response->assertRedirect(route('resumes.workstation', $resume));

        $this->assertSame('Alex Rivera', $resume->full_name);
        $this->assertSame('alex@example.com', $resume->email);
        $this->assertStringContainsString('roadmap', strtolower($resume->summary));
    }

    public function test_blank_create_still_works(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('resumes.store'));

        $resume = $user->resumes()->latest('id')->first();
        $this->assertNotNull($resume);
        $response->assertRedirect(route('resumes.workstation', $resume));
    }

    public function test_create_from_template_sets_template_and_opens_workstation(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('resumes.store'), [
            'template' => 'modern',
        ]);

        $resume = $user->resumes()->latest('id')->first();
        $this->assertNotNull($resume);
        $this->assertSame('modern', $resume->template);
        $response->assertRedirect(route('resumes.workstation', $resume));
    }

    /**
     * A role sample is someone else's content: the user's own contact details
     * must replace the sample's placeholder identity, while the sample's
     * headline/role survive (only contact fields are merged).
     */
    public function test_role_sample_takes_contact_from_starter_profile_but_keeps_sample_content(): void
    {
        $user = User::factory()->create(['name' => 'Account Name', 'email' => 'account@example.com']);
        StarterProfile::factory()->create([
            'user_id' => $user->id,
            'full_name' => 'Jane Doe',
            'email' => 'jane@example.com',
            'phone' => '555-0100',
            'location' => 'Denver, CO',
            'linkedin' => 'https://linkedin.com/in/jane',
            'website' => 'https://jane.dev',
            'target_role' => 'Profile Role',
        ]);

        $this->actingAs($user)->post(route('resumes.store'), [
            'sample' => 'software-engineer',
            'font' => 'georgia',
        ]);

        $resume = $user->resumes()->latest('id')->first();

        $this->assertSame('Jane Doe', $resume->full_name);
        $this->assertSame('jane@example.com', $resume->email);
        $this->assertSame('555-0100', $resume->phone);
        $this->assertSame('Denver, CO', $resume->location);
        $this->assertSame('https://linkedin.com/in/jane', $resume->linkedin);
        $this->assertSame('https://jane.dev', $resume->website);
        $this->assertSame('Software Engineer', $resume->target_role);
        $this->assertSame('georgia', $resume->font);
    }

    /**
     * Without a starter profile the account name/email stand in, and blank
     * contact fields are blank — never the sample's fake phone number.
     */
    public function test_role_sample_without_profile_uses_account_identity(): void
    {
        $user = User::factory()->create(['name' => 'Account Name', 'email' => 'account@example.com']);

        $this->actingAs($user)->post(route('resumes.store'), ['sample' => 'software-engineer']);

        $resume = $user->resumes()->latest('id')->first();

        $this->assertSame('Account Name', $resume->full_name);
        $this->assertSame('account@example.com', $resume->email);
        $this->assertSame('', (string) $resume->phone);
        $this->assertSame('inter', $resume->font);
    }

    /**
     * Pasted text is the user's own resume: what it contains wins, and the
     * profile only fills the contact fields the paste left out.
     */
    public function test_plain_text_import_prefers_parsed_contact_and_falls_back_to_profile(): void
    {
        $user = User::factory()->create();
        StarterProfile::factory()->create([
            'user_id' => $user->id,
            'full_name' => 'Profile Name',
            'email' => 'profile@example.com',
            'phone' => '555-0199',
            'location' => 'Austin, TX',
        ]);

        $this->actingAs($user)->post(route('resumes.store'), [
            'plain_text' => "Alex Rivera\nalex@example.com\n\nSUMMARY\nPM with roadmap ownership.",
            'template' => 'modern',
        ]);

        $resume = $user->resumes()->latest('id')->first();

        $this->assertSame('Alex Rivera', $resume->full_name);
        $this->assertSame('alex@example.com', $resume->email);
        $this->assertSame('555-0199', $resume->phone);
        $this->assertSame('Austin, TX', $resume->location);
        $this->assertSame('modern', $resume->template);
    }
}
