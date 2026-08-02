<?php

namespace App\Models;

use Database\Factories\ResumeNoteFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResumeNote extends Model
{
    /** @use HasFactory<ResumeNoteFactory> */
    use HasFactory;

    /**
     * `resume_id` is deliberately absent: the note's owner is the route-bound
     * resume, set through the relation, never from request input.
     */
    protected $fillable = [
        'body',
        'x',
        'y',
        'width',
        'height',
    ];

    /**
     * @return BelongsTo<Resume, $this>
     */
    public function resume(): BelongsTo
    {
        return $this->belongsTo(Resume::class);
    }
}
