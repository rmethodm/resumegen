<?php

namespace App\Support;

use App\Models\Resume;
use Barryvdh\DomPDF\Facade\Pdf;
use Barryvdh\DomPDF\PDF as DomPdf;
use Illuminate\Http\Response;

/**
 * The one DomPDF render of a resume — the {@see DocxExport} sibling. Every
 * PDF surface (web preview/download, mobile API, extension API, public share
 * download) goes through here so the font resolution, view, and paper size
 * cannot drift between them. The filename comes from the same document, so
 * callers only choose inline ({@see stream()}) or attachment ({@see download()}).
 */
final class PdfExport
{
    private function __construct(
        private readonly DomPdf $pdf,
        private readonly string $filename,
    ) {}

    public static function for(Resume $resume): self
    {
        $doc = ResumeDocument::toArray($resume);
        $pdfFont = PdfFonts::resolve($resume->font);
        PdfFonts::ensureInstalled($pdfFont);

        $pdf = Pdf::loadView('resumes.export.pdf', [
            'view' => ResumeExport::build($doc),
            'fontStack' => $pdfFont['stack'],
            'fontFaceCss' => PdfFonts::faceCss($pdfFont),
        ])->setPaper('letter');

        return new self($pdf, ResumeExport::filename($doc).'.pdf');
    }

    /** Content-Disposition inline, for iframes and in-app viewers. */
    public function stream(): Response
    {
        return $this->pdf->stream($this->filename);
    }

    /** Content-Disposition attachment. */
    public function download(): Response
    {
        return $this->pdf->download($this->filename);
    }
}
