<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use Illuminate\Http\Request;
use Inertia\Inertia;
use PhpOffice\PhpWord\Element\Table;
use PhpOffice\PhpWord\Element\Text;
use PhpOffice\PhpWord\Element\TextRun;
use PhpOffice\PhpWord\IOFactory;
use Smalot\PdfParser\Parser;

class ImportTestController extends Controller
{
    public function index()
    {
        return Inertia::render('ImportTest');
    }

    public function extract(Request $request)
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:pdf,docx,doc', 'max:5120'],
        ]);

        $file = $request->file('file');
        $ext = strtolower($file->getClientOriginalExtension());
        $path = $file->getRealPath();

        $rawText = match ($ext) {
            'pdf' => $this->extractPdf($path),
            'docx', 'doc' => $this->extractDocx($path),
        };

        $fields = $this->detectFields($rawText);

        // ponytail: hardcoded to rmethodm@outlook.com (user_id=1) — dev tool only
        $resume = Resume::create([
            'user_id' => 1,
            'name' => $fields['name'] ?? pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME),
            'contact' => [
                'email' => $fields['emails'][0] ?? null,
                'phone' => $fields['phones'][0] ?? null,
                'linkedin' => $fields['linkedin'] ?? null,
                'github' => $fields['github'] ?? null,
            ],
        ]);

        return response()->json([
            'filename' => $file->getClientOriginalName(),
            'extension' => $ext,
            'raw_text' => $rawText,
            'fields' => $fields,
            'resume_id' => $resume->id,
        ]);
    }

    private function extractPdf(string $path): string
    {
        $parser = new Parser;
        $pdf = $parser->parseFile($path);

        return $pdf->getText();
    }

    private function extractDocx(string $path): string
    {
        $phpWord = IOFactory::load($path);
        $lines = [];

        foreach ($phpWord->getSections() as $section) {
            $this->walkContainer($section, $lines);
        }

        return implode("\n", $lines);
    }

    private function walkContainer(mixed $container, array &$lines): void
    {
        foreach ($container->getElements() as $el) {
            if ($el instanceof TextRun) {
                $line = '';
                foreach ($el->getElements() as $child) {
                    if ($child instanceof Text) {
                        $line .= $child->getText();
                    }
                }
                if (trim($line) !== '') {
                    $lines[] = $line;
                }
            } elseif ($el instanceof Text) {
                if (trim($el->getText()) !== '') {
                    $lines[] = $el->getText();
                }
            } elseif ($el instanceof Table) {
                foreach ($el->getRows() as $row) {
                    foreach ($row->getCells() as $cell) {
                        $this->walkContainer($cell, $lines);
                    }
                }
            } elseif (method_exists($el, 'getElements')) {
                $this->walkContainer($el, $lines);
            }
        }
    }

    private function detectFields(string $text): array
    {
        $lines = array_values(array_filter(
            array_map('trim', explode("\n", $text))
        ));

        preg_match_all('/[\w.+\-]+@[\w\-]+\.[\w.\-]+/', $text, $emailMatches);
        preg_match_all('/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/', $text, $phoneMatches);
        preg_match('/linkedin\.com\/in\/[\w\-]+/i', $text, $linkedinMatch);
        preg_match('/github\.com\/[\w\-]+/i', $text, $githubMatch);

        $knownSections = [
            'EXPERIENCE', 'WORK EXPERIENCE', 'EMPLOYMENT', 'WORK HISTORY',
            'EDUCATION', 'SKILLS', 'SUMMARY', 'OBJECTIVE', 'PROFILE',
            'CERTIFICATIONS', 'PROJECTS', 'AWARDS', 'LANGUAGES', 'VOLUNTEER',
            'PUBLICATIONS', 'REFERENCES',
        ];

        $sections = [];
        foreach ($lines as $line) {
            $upper = strtoupper($line);
            foreach ($knownSections as $header) {
                if (str_contains($upper, $header) && strlen($line) < 60) {
                    $sections[] = $line;
                    break;
                }
            }
        }

        return [
            'name' => $lines[0] ?? null,
            'emails' => array_unique($emailMatches[0]),
            'phones' => array_unique($phoneMatches[0]),
            'linkedin' => $linkedinMatch[0] ?? null,
            'github' => $githubMatch[0] ?? null,
            'sections' => array_unique($sections),
            'line_count' => count($lines),
            'char_count' => strlen($text),
        ];
    }
}
