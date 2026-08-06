<?php

namespace App\Models;

use Database\Factories\ScrapedJobFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * A job listing pulled in by the scheduled scrape (Greenhouse, Lever, or a
 * configured career page). Ownerless — shared pool that JobImportSearch
 * blends into search results; a user only gets a row in ImportedJob once
 * they explicitly save one of these.
 *
 * @property int $id
 * @property string $source
 * @property string $external_id
 * @property string $title
 * @property string|null $company
 * @property string|null $location
 * @property string|null $url
 * @property string|null $salary
 * @property string|null $description
 * @property Carbon|null $posted_at
 * @property array<string, mixed>|null $raw
 */
#[Fillable([
    'source', 'external_id', 'title', 'company', 'location',
    'url', 'salary', 'description', 'posted_at', 'raw',
])]
class ScrapedJob extends Model
{
    /** @use HasFactory<ScrapedJobFactory> */
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
}
