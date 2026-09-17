<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobPoolEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'job_listing_id',
        'resume_id',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function jobListing(): BelongsTo
    {
        return $this->belongsTo(JobListing::class);
    }

    public function resume(): BelongsTo
    {
        return $this->belongsTo(Resume::class);
    }
}
