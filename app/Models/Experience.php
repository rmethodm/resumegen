<?php

namespace App\Models;

use Database\Factories\ExperienceFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property list<string> $bullets
 */
class Experience extends Model
{
    /** @use HasFactory<ExperienceFactory> */
    use HasFactory;

    /**
     * Keep the parent's updated_at (the mobile sync/409 token) current on
     * direct child writes. ResumeDocument::save bulk-inserts and touches the
     * resume itself, so this adds no extra write there.
     *
     * @var list<string>
     */
    protected $touches = ['resume'];

    protected $fillable = [
        'position',
        'title',
        'company',
        'start_date',
        'end_date',
        'is_current',
        'bullets',
    ];

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
        return [
            'bullets' => 'array',
            'is_current' => 'boolean',
        ];
    }
}
