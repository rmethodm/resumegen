<?php

namespace App\Services;

use App\Models\Resume;
use PhpOffice\PhpWord\PhpWord;

class DocxGenerator
{
    public function generate(Resume $resume): PhpWord
    {
        $word = new PhpWord();
        $word->setDefaultFontName('Calibri');
        $word->setDefaultFontSize(11);

        $section = $word->addSection([
            'marginTop'    => 720,
            'marginBottom' => 720,
            'marginLeft'   => 900,
            'marginRight'  => 900,
        ]);

        $contact = $resume->contact ?? [];
        $name = $contact['full_name'] ?? 'Your Name';

        // Name
        $section->addText($name, ['bold' => true, 'size' => 18], ['spaceAfter' => 60]);

        // Contact line
        $contactParts = array_filter([
            $contact['email'] ?? null,
            $contact['phone'] ?? null,
            $contact['location'] ?? null,
            $contact['linkedin'] ?? null,
            $contact['website'] ?? null,
        ]);
        if ($contactParts) {
            $section->addText(implode('  |  ', $contactParts), ['size' => 9, 'color' => '666666'], ['spaceAfter' => 120]);
        }

        // Summary
        if (! empty($resume->summary)) {
            $this->addSectionHeading($section, 'Summary');
            $section->addText($resume->summary, ['size' => 10], ['spaceAfter' => 80]);
        }

        // Experience
        $experience = array_filter($resume->experience ?? [], fn ($e) => ! empty($e['company']) || ! empty($e['title']));
        if ($experience) {
            $this->addSectionHeading($section, 'Experience');
            foreach ($experience as $exp) {
                $title = trim(($exp['title'] ?? '') . ($exp['company'] ? ' — ' . $exp['company'] : ''));
                $dates = implode(' – ', array_filter([
                    $exp['start_date'] ?? null,
                    isset($exp['current']) && $exp['current'] ? 'Present' : ($exp['end_date'] ?? null),
                ]));
                $section->addText($title, ['bold' => true, 'size' => 10], ['spaceAfter' => 0]);
                if ($dates) {
                    $section->addText($dates, ['size' => 9, 'color' => '666666'], ['spaceAfter' => 0]);
                }
                if (! empty($exp['bullets'])) {
                    foreach (array_filter(explode("\n", $exp['bullets'])) as $bullet) {
                        $section->addListItem(trim($bullet), 0, ['size' => 10]);
                    }
                }
                $section->addTextBreak(1);
            }
        }

        // Education
        $education = array_filter($resume->education ?? [], fn ($e) => ! empty($e['school']));
        if ($education) {
            $this->addSectionHeading($section, 'Education');
            foreach ($education as $edu) {
                $degree = implode(', ', array_filter([$edu['degree'] ?? null, $edu['field'] ?? null]));
                $section->addText($edu['school'], ['bold' => true, 'size' => 10], ['spaceAfter' => 0]);
                if ($degree) {
                    $section->addText($degree, ['size' => 10], ['spaceAfter' => 0]);
                }
                $dates = implode(' – ', array_filter([$edu['start_date'] ?? null, $edu['end_date'] ?? null]));
                if ($dates) {
                    $section->addText($dates, ['size' => 9, 'color' => '666666'], ['spaceAfter' => 0]);
                }
                $section->addTextBreak(1);
            }
        }

        // Skills
        if (! empty($resume->skills)) {
            $this->addSectionHeading($section, 'Skills');
            $section->addText(implode(', ', $resume->skills), ['size' => 10], ['spaceAfter' => 80]);
        }

        // Certifications
        $certs = array_filter($resume->certifications ?? [], fn ($c) => ! empty($c['name']));
        if ($certs) {
            $this->addSectionHeading($section, 'Certifications');
            foreach ($certs as $cert) {
                $line = $cert['name'];
                if (! empty($cert['issuer'])) {
                    $line .= ' — ' . $cert['issuer'];
                }
                if (! empty($cert['date'])) {
                    $line .= ' (' . $cert['date'] . ')';
                }
                $section->addText($line, ['size' => 10], ['spaceAfter' => 40]);
            }
        }

        return $word;
    }

    private function addSectionHeading($section, string $text): void
    {
        $section->addText(strtoupper($text), [
            'bold'  => true,
            'size'  => 9,
            'color' => '4f46e5',
        ], [
            'spaceAfter'        => 40,
            'borderBottomSize'  => 4,
            'borderBottomColor' => '4f46e5',
        ]);
    }
}
