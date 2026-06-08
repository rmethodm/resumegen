<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResumeSectionEvent extends Model
{
    public const UPDATED_AT = null; // append-only, no updated_at column

    protected $fillable = ['resume_id', 'section', 'dwell_ms', 'ip_hash'];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }

    public function resume(): BelongsTo
    {
        return $this->belongsTo(Resume::class);
    }
}
