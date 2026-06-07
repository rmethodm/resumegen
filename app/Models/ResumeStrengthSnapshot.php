<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResumeStrengthSnapshot extends Model
{
    public $timestamps = false;

    protected $fillable = ['resume_id', 'score', 'checklist'];

    protected $casts = [
        'checklist' => 'array',
        'created_at' => 'datetime',
    ];

    public function resume(): BelongsTo
    {
        return $this->belongsTo(Resume::class);
    }
}
