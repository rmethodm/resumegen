<?php

namespace App\Models;

use Database\Factories\ImportedJobFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A job listing a user pulled in from an external search API (Adzuna,
 * USAJOBS) via the Job Imports page. Deduped per user on (source, external_id).
 *
 * @property int $id
 * @property int $user_id
 * @property string $source
 * @property string $external_id
 * @property string $title
 * @property string|null $company
 * @property string|null $location
 * @property string|null $url
 * @property string|null $salary
 * @property string|null $description
 * @property Carbon|null $posted_at
 * @property string $status
 * @property array<string, mixed>|null $raw
 */
#[Fillable([
    'user_id', 'source', 'external_id', 'title', 'company', 'location',
    'url', 'salary', 'description', 'posted_at', 'status', 'raw',
])]
class ImportedJob extends Model
{
    /** @use HasFactory<ImportedJobFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'posted_at' => 'datetime',
            'raw' => 'array',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
