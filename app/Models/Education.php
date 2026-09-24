<?php

namespace App\Models;

use Database\Factories\EducationFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Education extends Model
{
    /** @use HasFactory<EducationFactory> */
    use HasFactory;

    /** "educations" is not a word; the table is named for the section. */
    protected $table = 'education';

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
        'school',
        'degree',
        'field',
        'graduation_year',
    ];

    /**
     * @return BelongsTo<Resume, $this>
     */
    public function resume(): BelongsTo
    {
        return $this->belongsTo(Resume::class);
    }
}
