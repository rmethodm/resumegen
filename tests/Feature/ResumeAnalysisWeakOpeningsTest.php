<?php

namespace Tests\Feature;

use App\Models\Experience;
use App\Models\Resume;
use App\Support\ResumeAnalysis;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ResumeAnalysisWeakOpeningsTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Build a resume with a single experience carrying one bullet, and
     * return the first suggestion ResumeAnalysis produces for it (or null).
     */
    private function suggestionFor(string $bullet): ?array
    {
        $resume = Resume::factory()->create([
            // Long enough summary, and a target_role with no keyword family,
            // so profile/keyword gap suggestions never crowd out the bullet
            // suggestion under test.
            'summary' => str_repeat('Experienced professional building things. ', 3),
            'target_role' => '',
        ]);

        Experience::factory()->for($resume)->create([
            'title' => 'Engineer',
            'company' => 'Acme',
            'bullets' => [$bullet],
        ]);

        $resume->load('experiences', 'skills');

        $suggestions = ResumeAnalysis::suggestions($resume);

        foreach ($suggestions as $suggestion) {
            if ($suggestion['bullet'] === 0 && $suggestion['experience'] === 0) {
                return $suggestion;
            }
        }

        return null;
    }

    /**
     * @return array<string, array{0: string}>
     */
    public static function responsibilityPhrases(): array
    {
        return [
            'responsible for' => ['Responsible for managing ServiceNow tickets.'],
            'was responsible for' => ['Was responsible for onboarding new hires.'],
            'duties included' => ['Duties included managing the shared inbox.'],
            'tasked with' => ['Tasked with reducing support backlog.'],
            'in charge of' => ['In charge of the release calendar.'],
            'charged with' => ['Charged with vendor negotiations.'],
            'assigned to' => ['Assigned to the migration project.'],
            'served as' => ['Served as team lead for the rollout.'],
        ];
    }

    /**
     * @return array<string, array{0: string}>
     */
    public static function passiveParticipationPhrases(): array
    {
        return [
            'participated in' => ['Participated in the quarterly planning cycle.'],
            'took part in' => ['Took part in the hiring committee.'],
            'was involved in' => ['Was involved in the platform migration.'],
            'involved in' => ['Involved in the onboarding redesign.'],
            'was part of' => ['Was part of the incident response team.'],
            'joined a team that' => ['Joined a team that shipped the new checkout.'],
            'contributed to' => ['Contributed to the internal wiki.'],
        ];
    }

    /**
     * @return array<string, array{0: string}>
     */
    public static function vagueAssistancePhrases(): array
    {
        return [
            'helped with' => ['Helped with career events.'],
            'helped to' => ['Helped to onboard new interns.'],
            'assisted with' => ['Assisted with career events.'],
            'aided in' => ['Aided in the audit process.'],
            'provided assistance with' => ['Provided assistance with payroll runs.'],
        ];
    }

    /**
     * @return array<string, array{0: string}>
     */
    public static function genericWorkPhrases(): array
    {
        return [
            'worked on' => ['Worked on Mac deployment scripts.'],
            'worked with' => ['Worked with the design team on mockups.'],
            'dealt with' => ['Dealt with escalations from enterprise accounts.'],
            'handled' => ['Handled customer refunds.'],
            'took care of' => ['Took care of the vendor renewals.'],
            'did' => ['Did the quarterly inventory count.'],
            'performed' => ['Performed routine server maintenance.'],
            'utilized' => ['Utilized the internal ticketing system.'],
            'used' => ['Used Salesforce to track leads.'],
        ];
    }

    #[DataProvider('responsibilityPhrases')]
    public function test_detects_responsibility_phrase(string $bullet): void
    {
        $suggestion = $this->suggestionFor($bullet);

        $this->assertNotNull($suggestion);
        $this->assertSame('responsibility', $suggestion['category']);
    }

    #[DataProvider('passiveParticipationPhrases')]
    public function test_detects_passive_participation_phrase(string $bullet): void
    {
        $suggestion = $this->suggestionFor($bullet);

        $this->assertNotNull($suggestion);
        $this->assertSame('passive participation', $suggestion['category']);
    }

    #[DataProvider('vagueAssistancePhrases')]
    public function test_detects_vague_assistance_phrase(string $bullet): void
    {
        $suggestion = $this->suggestionFor($bullet);

        $this->assertNotNull($suggestion);
        $this->assertSame('vague assistance', $suggestion['category']);
    }

    #[DataProvider('genericWorkPhrases')]
    public function test_detects_generic_work_phrase(string $bullet): void
    {
        $suggestion = $this->suggestionFor($bullet);

        $this->assertNotNull($suggestion);
        $this->assertSame('generic work', $suggestion['category']);
    }

    public function test_detection_is_case_insensitive(): void
    {
        $suggestion = $this->suggestionFor('RESPONSIBLE FOR the finance ledger.');

        $this->assertNotNull($suggestion);
        $this->assertSame('responsibility', $suggestion['category']);
    }

    public function test_detects_phrase_after_leading_whitespace(): void
    {
        $suggestion = $this->suggestionFor('   Responsible for the finance ledger.');

        $this->assertNotNull($suggestion);
        $this->assertSame('responsibility', $suggestion['category']);
    }

    public function test_detects_phrase_after_leading_punctuation(): void
    {
        $suggestion = $this->suggestionFor('- Responsible for the finance ledger.');

        $this->assertNotNull($suggestion);
        $this->assertSame('responsibility', $suggestion['category']);
    }

    public function test_ignores_weak_phrase_appearing_mid_sentence(): void
    {
        $suggestion = $this->suggestionFor('Led the migration and was involved in the retro afterward.');

        // "was involved in" appears mid-sentence, not at the opening, so it
        // should not be flagged — and this bullet is otherwise quantified-free
        // but has no digit either, so if nothing fires we'd expect the
        // quantify suggestion (different message) rather than a weak-opening one.
        $this->assertNotNull($suggestion);
        $this->assertNull($suggestion['category']);
        $this->assertStringContainsString('Quantify', $suggestion['message']);
    }

    public function test_legitimate_use_of_assisted_is_not_flagged(): void
    {
        // "Assisted" without the trailing "with" is a normal, specific verb,
        // and the bullet is already quantified — nothing should be flagged.
        $suggestion = $this->suggestionFor('Assisted 40 customers per day with billing disputes.');

        $this->assertNull($suggestion);
    }

    public function test_legitimate_use_of_helped_is_not_flagged(): void
    {
        $suggestion = $this->suggestionFor('Helped 12 engineers ship their first pull request.');

        $this->assertNull($suggestion);
    }

    public function test_legitimate_use_of_supported_is_not_flagged(): void
    {
        // Bare "supported" is deliberately excluded from the phrase table:
        // it reads naturally in too many non-vague constructions to flag
        // safely (e.g. describing being backed by something, not vague
        // team assistance).
        $suggestion = $this->suggestionFor('Supported by three years of audit experience, closed the books early.');

        $this->assertNotNull($suggestion);
        $this->assertNull($suggestion['category']);
    }

    public function test_legitimate_use_of_participated_is_not_flagged(): void
    {
        // "Participated" alone (no "in") is not in the phrase table.
        $suggestion = $this->suggestionFor('Participated actively, raising two process improvements per sprint.');

        $this->assertNotNull($suggestion);
        $this->assertNull($suggestion['category']);
    }

    public function test_responsible_for_gets_a_safe_automatic_rewrite(): void
    {
        $suggestion = $this->suggestionFor('Responsible for the ServiceNow ticket queue.');

        $this->assertNotNull($suggestion);
        $this->assertSame('Managed the ServiceNow ticket queue.', $suggestion['rewrite']);
    }

    public function test_responsible_for_followed_by_a_gerund_is_coaching_only(): void
    {
        // "Responsible for" + "-ing" verb ("managing") would double up into
        // "Managed managing tickets" if blindly prefixed — must not auto-rewrite.
        $suggestion = $this->suggestionFor('Responsible for managing ServiceNow tickets.');

        $this->assertNotNull($suggestion);
        $this->assertSame('responsibility', $suggestion['category']);
        $this->assertNull($suggestion['rewrite']);
    }

    public function test_rewrite_preserves_the_rest_of_the_bullet_verbatim(): void
    {
        $suggestion = $this->suggestionFor('Responsible for the Q3 vendor audit and budget reconciliation.');

        $this->assertSame(
            'Managed the Q3 vendor audit and budget reconciliation.',
            $suggestion['rewrite'],
        );
    }

    public function test_vague_assistance_never_gets_an_automatic_leadership_rewrite(): void
    {
        $suggestion = $this->suggestionFor('Assisted with career events.');

        $this->assertNotNull($suggestion);
        $this->assertNull($suggestion['rewrite']);
        $this->assertNotEquals('Led with career events.', $suggestion['rewrite']);
    }

    public function test_coaching_suggestion_is_returned_when_no_safe_rewrite_exists(): void
    {
        $suggestion = $this->suggestionFor('Worked on Mac deployment scripts.');

        $this->assertNotNull($suggestion);
        $this->assertNull($suggestion['rewrite']);
        $this->assertSame('generic work', $suggestion['category']);
        $this->assertNotSame('', $suggestion['message']);
        $this->assertNotEmpty($suggestion['verbs']);
    }

    public function test_passive_participation_never_claims_leadership(): void
    {
        $suggestion = $this->suggestionFor('Was part of the incident response rotation.');

        $this->assertNotNull($suggestion);
        $this->assertNull($suggestion['rewrite']);
        $this->assertSame('passive participation', $suggestion['category']);
    }
}
