<?php

namespace App\Console\Commands;

use App\Data\SampleResume;
use App\Models\Resume;
use App\Services\ResumeThumbnailGenerator;
use Illuminate\Console\Command;

class GenerateTemplateThumbnails extends Command
{
    protected $signature = 'thumbnails:templates';

    protected $description = 'Render the sample resume in every template into public/images/templates.';

    /**
     * The canonical nine templates (keep in sync with the editor's template list).
     */
    public const TEMPLATES = [
        'classic', 'modern', 'minimal', 'minimal-ruled', 'executive',
        'ats', 'skills-first', 'academic', 'bold',
    ];

    public function handle(ResumeThumbnailGenerator $generator): int
    {
        $dir = public_path('images/templates');
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        foreach (self::TEMPLATES as $template) {
            $resume = new Resume(SampleResume::data());
            $resume->template = $template;

            file_put_contents("{$dir}/{$template}.png", $generator->generate($resume));
            $this->info("Generated {$template}.png");
        }

        return self::SUCCESS;
    }
}
