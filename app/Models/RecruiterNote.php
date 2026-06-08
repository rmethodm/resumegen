<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RecruiterNote extends Model
{
    protected $fillable = ['organization_id', 'resume_id', 'author_id', 'body'];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function resume(): BelongsTo
    {
        return $this->belongsTo(Resume::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}
