<?php

namespace App\Services;

use App\Models\Resume;
use Barryvdh\DomPDF\Facade\Pdf;
use Imagick;

class ResumeThumbnailGenerator
{
    /**
     * Render the first page of a resume's PDF to a PNG (≈400px wide).
     */
    public function generate(Resume $resume): string
    {
        $pdf = Pdf::loadView('resume-pdf', ['resume' => $resume])
            ->setPaper('letter', 'portrait')
            ->output();

        $imagick = new Imagick;
        $imagick->setResolution(150, 150);
        $imagick->readImageBlob($pdf);
        $imagick->setIteratorIndex(0);
        $imagick->setImageBackgroundColor('white');
        $imagick->setImageAlphaChannel(Imagick::ALPHACHANNEL_REMOVE);
        $imagick->setImageFormat('png');
        $imagick->thumbnailImage(400, 0);
        $blob = $imagick->getImageBlob();
        $imagick->clear();
        $imagick->destroy();

        return $blob;
    }
}
