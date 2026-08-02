<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResumeNote extends Model
{
    use HasFactory;

    protected $fillable = ['body'];

    public function resume(): BelongsTo
    {
        return $this->belongsTo(Resume::class);
    }
}
