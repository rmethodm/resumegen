<?php

namespace App\Actions;

use App\Models\Resume;
use App\Models\StarterProfile;
use App\Models\User;
use App\Support\PlainTextResumeParser;
use App\Support\ResumeDocument;
use App\Support\RoleSamples;
use Illuminate\Support\Facades\DB;

/**
 * Create a brand-new resume (always its own new group) from one of three
 * starting points: a role sample, pasted plain text, or a blank page seeded
 * from the user's starter profile. Contact precedence differs on purpose:
 * a role sample is someone else's content, so the user's contact replaces
 * it; pasted text is the user's own resume, so the paste wins and the
 * profile only fills what it left out.
 */
class CreateResume
{
    private const CONTACT_FIELDS = ['full_name', 'email', 'phone', 'location', 'linkedin', 'website'];

    /**
     * @param  array{template?: string|null, font?: string|null, sample?: string|null, plain_text?: string|null}  $data  Validated StoreResumeRequest data.
     */
    public function handle(User $user, array $data): Resume
    {
        $sampleId = $data['sample'] ?? null;
        $plainText = isset($data['plain_text']) ? trim((string) $data['plain_text']) : '';

        if (is_string($sampleId) && $sampleId !== '') {
            return $this->fromSample($user, $sampleId, $data);
        }

        if ($plainText !== '') {
            return $this->fromPlainText($user, $plainText, $data);
        }

        return DB::transaction(function () use ($user, $data): Resume {
            $resume = $user->resumes()->create(array_filter([
                'title' => 'Untitled resume',
                'template' => $data['template'] ?? null,
                'font' => $data['font'] ?? null,
                ...$this->starterProfileContactFields($user),
            ], fn (mixed $value): bool => $value !== null));

            $this->seedExperiencesAndSkills($resume, $user->starterProfile);

            return $resume;
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function fromSample(User $user, string $sampleId, array $data): Resume
    {
        $sample = RoleSamples::find($sampleId);
        abort_unless($sample !== null, 422);

        $contact = $this->starterProfileContactFields($user);
        $sampleDocument = $sample['document'];

        // Name and email fall back to the sample's; the rest never do — a
        // sample's placeholder phone or URL must not reach a real resume.
        $document = array_merge($sampleDocument, [
            'full_name' => $contact['full_name'] !== '' ? $contact['full_name'] : ($sampleDocument['full_name'] ?? 'Your Name'),
            'email' => $contact['email'] !== '' ? $contact['email'] : ($sampleDocument['email'] ?? ''),
            'phone' => $contact['phone'],
            'location' => $contact['location'],
            'linkedin' => $contact['linkedin'],
            'website' => $contact['website'],
            'template' => $data['template'] ?? ($sampleDocument['template'] ?? 'ats-plain'),
            'font' => $data['font'] ?? 'inter',
        ]);

        return $this->createFromDocument($user, $document, $sample['label']);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function fromPlainText(User $user, string $plainText, array $data): Resume
    {
        $parsed = PlainTextResumeParser::parse($plainText);
        $contact = $this->starterProfileContactFields($user);

        $merged = [];
        foreach (self::CONTACT_FIELDS as $field) {
            $merged[$field] = ($parsed[$field] ?? '') !== '' ? $parsed[$field] : $contact[$field];
        }

        $document = array_merge($parsed, $merged, [
            'template' => $data['template'] ?? 'ats-plain',
            'font' => $data['font'] ?? 'inter',
        ]);

        return $this->createFromDocument($user, $document, 'Imported resume');
    }

    /**
     * @param  array<string, mixed>  $document
     */
    private function createFromDocument(User $user, array $document, string $fallbackTitle): Resume
    {
        $resume = DB::transaction(function () use ($user, $document, $fallbackTitle): Resume {
            $resume = $user->resumes()->create([
                'title' => $document['title'] ?? $fallbackTitle,
            ]);
            ResumeDocument::save($resume, $document);

            return $resume;
        });

        return $resume->fresh();
    }

    /** @return array<string, string> */
    private function starterProfileContactFields(User $user): array
    {
        $profile = $user->starterProfile;

        return [
            'full_name' => $profile?->full_name ?: $user->name,
            'headline' => $profile?->headline ?? '',
            'email' => $profile?->email ?: $user->email,
            'phone' => $profile?->phone ?? '',
            'location' => $profile?->location ?? '',
            'target_role' => $profile?->target_role ?? '',
            'linkedin' => $profile?->linkedin ?? '',
            'website' => $profile?->website ?? '',
        ];
    }

    /**
     * With a profile, seed its experience snapshot and skills; without one,
     * keep the old single empty experience row so the editor never opens on
     * nothing.
     */
    private function seedExperiencesAndSkills(Resume $resume, ?StarterProfile $profile): void
    {
        $experiences = $profile?->experience_snapshot ?? [];

        if ($profile === null) {
            $resume->experiences()->create(['position' => 0, 'bullets' => []]);
        } else {
            foreach (array_values($experiences) as $index => $experience) {
                $resume->experiences()->create([
                    'position' => $index,
                    'title' => $experience['title'] ?? '',
                    'company' => $experience['company'] ?? '',
                    'start_date' => $experience['start_date'] ?? '',
                    'end_date' => $experience['end_date'] ?? '',
                    'is_current' => (bool) ($experience['is_current'] ?? false),
                    'bullets' => array_values(array_filter(
                        $experience['bullets'] ?? [],
                        fn (mixed $line): bool => is_string($line) && trim($line) !== '',
                    )),
                ]);
            }
        }

        foreach (array_values($profile?->skills ?? []) as $index => $skill) {
            $resume->skills()->create([
                'position' => $index,
                'category' => $skill['category'] ?? '',
                'name' => $skill['name'],
            ]);
        }
    }
}
