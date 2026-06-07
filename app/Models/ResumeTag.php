<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResumeTag extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = ['resume_id', 'label', 'color'];

    protected $casts = ['created_at' => 'datetime'];

    public function resume(): BelongsTo
    {
        return $this->belongsTo(Resume::class);
    }
}
