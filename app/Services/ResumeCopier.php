<?php

namespace App\Services;

use App\Data\ResumeRules;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Support\Str;

class ResumeCopier
{
    public static function copy(Resume $source, User $owner, string $name): Resume
    {
        $fields = ['name' => $name, 'pdf_filename' => Str::uuid().'.pdf'];

        foreach (ResumeRules::copyFields() as $field) {
            $fields[$field] = $source->{$field};
        }

        return $owner->resumes()->create($fields);
    }
}
