<?php

namespace App\Http\Controllers;

use App\Data\AiPrompts;
use App\Models\Resume;
use App\Services\AiService;
use App\Services\JobPairingService;
use App\Services\UserLimits;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Smalot\PdfParser\Parser;

class ResumeImportController extends Controller
{
    public function __construct(private AiService $ai, private JobPairingService $pairings) {}

    public function extract(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:pdf', 'max:5120'],
        ]);

        $user = $request->user();

        if (! UserLimits::canUseAi($user)) {
            return response()->json(['error' => UserLimits::aiLimitMessage($user)], 402);
        }

        // ponytail: smalot/pdfparser emits warnings on some PDFs; suppress so Laravel doesn't convert to ErrorException
        $text = @(new Parser)->parseFile($request->file('file')->getRealPath())->getText();

        if (trim($text) === '') {
            return response()->json(['error' => 'No readable text in that PDF — scanned images are not supported.'], 422);
        }

        $json = $this->ai->chat(AiPrompts::build('import_resume', ['text' => $text]), [
            'user' => $user,
            'feature' => 'import_resume',
            'response_format' => ['type' => 'json_object'],
            'max_tokens' => 4000,
        ]);

        $data = json_decode($json, true);

        if (! is_array($data)) {
            return response()->json(['error' => 'Could not parse that resume. Try a different PDF.'], 422);
        }

        // An import targets no job — it lands in __general__ so the spend is visible in
        // the §12 data without inventing a pairing the user never tailored for.
        $this->pairings->resolveGeneral($user);

        return response()->json([
            'data' => $data,
            'detected_name' => $data['contact']['full_name'] ?? 'Imported Resume',
        ]);
    }

    public function confirm(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'data' => ['required', 'array'],
            'action' => ['required', 'in:new,overwrite'],
            'resume_id' => ['required_if:action,overwrite', 'nullable', 'integer'],
            'name' => ['required_if:action,new', 'nullable', 'string', 'max:255'],
        ]);

        $fields = $validated['data'];
        $contact = is_array($fields['contact'] ?? null) ? $fields['contact'] : [];

        $attributes = [
            'contact' => [
                'full_name' => $contact['full_name'] ?? null,
                'email' => $contact['email'] ?? null,
                'phone' => $contact['phone'] ?? null,
                'location' => $contact['location'] ?? null,
                'linkedin' => $contact['linkedin'] ?? null,
                'github' => $contact['github'] ?? null,
                'website' => $contact['website'] ?? null,
            ],
            'summary' => is_string($fields['summary'] ?? null) ? $fields['summary'] : null,
            'experience' => is_array($fields['experience'] ?? null) ? $fields['experience'] : null,
            'education' => is_array($fields['education'] ?? null) ? $fields['education'] : null,
            'projects' => is_array($fields['projects'] ?? null) ? $fields['projects'] : null,
            'skills' => is_array($fields['skills'] ?? null) ? $fields['skills'] : null,
            'certifications' => is_array($fields['certifications'] ?? null) ? $fields['certifications'] : null,
        ];

        if ($validated['action'] === 'overwrite') {
            $resume = Resume::findOrFail($validated['resume_id']);
            $this->authorize('update', $resume);
            $resume->update($attributes);
        } else {
            $resume = $request->user()->resumes()->create([
                'name' => $validated['name'],
                'pdf_filename' => Str::uuid().'.pdf',
                ...$attributes,
            ]);
        }

        return redirect()->route('builder.edit', $resume->id);
    }
}
