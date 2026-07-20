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
        // Imagick stamps date:create / date:modify / date:timestamp and a tIME chunk into
        // every PNG, so re-rendering an unchanged resume produces a byte-different file.
        // For the nine committed template samples that meant `thumbnails:templates` dirtied
        // all nine on every run with pixel-identical output; for user thumbnails it embedded
        // a creation timestamp in a file recruiters receive. Excluding both fixes both.
        $imagick->setOption('png:exclude-chunk', 'date,time');
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
