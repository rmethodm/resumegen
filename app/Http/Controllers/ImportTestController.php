<?php

namespace App\Http\Controllers;

use App\Models\AiRequest;
use App\Models\Resume;
use App\Services\AiService;
use App\Services\UserLimits;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use OpenAI\Contracts\ClientContract;
use PhpOffice\PhpWord\Element\Table;
use PhpOffice\PhpWord\Element\Text;
use PhpOffice\PhpWord\Element\TextRun;
use PhpOffice\PhpWord\IOFactory;
use Smalot\PdfParser\Parser;

class ImportTestController extends Controller
{
    public function __construct(
        private ClientContract $openai,
        private AiService $ai,
    ) {}

    public function index()
    {
        return Inertia::render('ImportTest');
    }

    public function extract(Request $request)
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:pdf,docx,doc,jpeg,jpg', 'max:5120'],
        ]);

        $user = $request->user();

        if (! UserLimits::canUseAi($user)) {
            return response()->json([
                'error' => UserLimits::aiLimitMessage($user),
                'limit' => UserLimits::aiMonthlyLimit($user),
            ], 402);
        }

        $file = $request->file('file');
        $ext = strtolower($file->getClientOriginalExtension());
        $path = $file->getRealPath();

        $useAi = $request->boolean('use_ai', true);

        $rawText = match ($ext) {
            'pdf' => $this->extractPdf($path),
            'docx', 'doc' => $this->extractDocx($path),
            'jpeg', 'jpg' => $useAi ? $this->extractJpegAi($path, $user) : $this->extractJpegOcr($path),
        };

        $fields = $this->parseWithAi($rawText, $user);

        $resume = $this->createResume($file->getClientOriginalName(), $fields);

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

        // ponytail: smalot/pdfparser emits warnings on some PDFs; suppress so Laravel doesn't convert to ErrorException
        return @$pdf->getText();
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

    private function extractJpegAi(string $path, mixed $user = null): string
    {
        $base64 = base64_encode(file_get_contents($path));
        $model = config('ai.model', 'gpt-4o-mini');

        $response = $this->openai->chat()->create([
            'model' => $model,
            'messages' => [[
                'role' => 'user',
                'content' => [
                    ['type' => 'text', 'text' => 'Extract all readable text from this resume image. Return only the raw text, preserving the original layout as much as possible. No commentary.'],
                    ['type' => 'image_url', 'image_url' => ['url' => 'data:image/jpeg;base64,'.$base64]],
                ],
            ]],
            'max_tokens' => 2000,
        ]);

        AiRequest::create([
            'user_id' => $user?->id,
            'feature' => 'import_jpeg',
            'model' => $model,
            'prompt_tokens' => $response->usage->promptTokens ?? 0,
            'completion_tokens' => $response->usage->completionTokens ?? 0,
            'total_tokens' => $response->usage->totalTokens ?? 0,
            'estimated_cost_cents' => 0,
            'status' => 'success',
        ]);

        return $response->choices[0]->message->content ?? '';
    }

    private function extractJpegOcr(string $path): string
    {
        $bin = trim(shell_exec('which tesseract') ?: '/opt/homebrew/bin/tesseract');
        $out = sys_get_temp_dir().'/resumegen_ocr_'.uniqid();
        exec($bin.' '.escapeshellarg($path).' '.escapeshellarg($out).' -l eng 2>/dev/null', result_code: $code);
        $txt = $out.'.txt';
        $text = ($code === 0 && file_exists($txt)) ? file_get_contents($txt) : '';
        @unlink($txt);

        return $text;
    }

    private function parseWithAi(string $text, mixed $user = null): array
    {
        // ponytail: cap prevents runaway costs on multi-page resumes; ~3000 tokens fits any single resume
        $text = mb_substr($text, 0, 12000);

        $prompt = <<<'PROMPT'
You are a resume parser. Extract all information from the resume text below and return it as a single JSON object.

Required JSON structure:
{
  "contact": {
    "full_name": "",
    "email": "",
    "phone": "",
    "location": "",
    "linkedin": "",
    "github": "",
    "website": ""
  },
  "summary": "",
  "experience": [
    {
      "id": "exp-1",
      "company": "",
      "title": "",
      "start_date": "",
      "end_date": "",
      "current": false,
      "bullets": "First bullet\nSecond bullet"
    }
  ],
  "education": [
    {
      "id": "edu-1",
      "school": "",
      "degree": "",
      "field": "",
      "grad_year": ""
    }
  ],
  "projects": [
    {
      "id": "proj-1",
      "name": "",
      "description": "",
      "url": "",
      "start_date": "",
      "end_date": "",
      "bullets": "First bullet\nSecond bullet"
    }
  ],
  "skills": ["skill1", "skill2"],
  "certifications": [
    {
      "id": "cert-1",
      "name": "",
      "issuer": "",
      "date": "",
      "expiration": "",
      "credential_id": ""
    }
  ]
}

Rules:
- Use null for any field that is absent from the resume
- bullets: each bullet point on its own line, no leading dash or symbol
- skills: flat array of individual skill strings
- IDs: sequential strings like exp-1, exp-2, edu-1, proj-1, cert-1, etc.
- Return ONLY the JSON object, no prose or markdown

RESUME TEXT:
PROMPT;

        $json = $this->ai->chat(
            $prompt."\n\n".$text,
            [
                'user' => $user,
                'feature' => 'import_parse',
                'response_format' => ['type' => 'json_object'],
                'max_tokens' => 4000,
            ]
        );

        return json_decode($json, true) ?? [];
    }

    private function createResume(string $filename, array $fields): Resume
    {
        $name = pathinfo($filename, PATHINFO_FILENAME) ?: 'Imported Resume';

        $contact = $fields['contact'] ?? [];

        return auth()->user()->resumes()->create([
            'name' => $name,
            'pdf_filename' => Str::uuid().'.pdf',
            'contact' => [
                'full_name' => $contact['full_name'] ?? null,
                'email' => $contact['email'] ?? null,
                'phone' => $contact['phone'] ?? null,
                'location' => $contact['location'] ?? null,
                'linkedin' => $contact['linkedin'] ?? null,
                'github' => $contact['github'] ?? null,
                'website' => $contact['website'] ?? null,
            ],
            'summary' => $fields['summary'] ?? null,
            'experience' => $fields['experience'] ?? null,
            'education' => $fields['education'] ?? null,
            'projects' => $fields['projects'] ?? null,
            'skills' => $fields['skills'] ?? null,
            'certifications' => $fields['certifications'] ?? null,
        ]);
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
}
