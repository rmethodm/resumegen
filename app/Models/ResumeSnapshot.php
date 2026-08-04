<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * The resume as it was immediately before a destructive import.
 *
 * ResumeDocument::save() replaces every child row, so an import over an
 * existing resume is unrecoverable without this.
 *
 * @property array<string, mixed> $document
 */
class ResumeSnapshot extends Model
{
    protected $fillable = ['resume_id', 'label', 'document'];

    /**
     * @return BelongsTo<Resume, $this>
     */
    public function resume(): BelongsTo
    {
        return $this->belongsTo(Resume::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['document' => 'array'];
    }
}
