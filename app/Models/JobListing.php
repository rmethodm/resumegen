<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobListing extends Model
{
    use HasFactory;

    protected $fillable = [
        'job_search_id', 'source', 'external_id', 'title', 'company', 'location',
        'url', 'description', 'salary_min', 'salary_max', 'posted_at',
        'fit_score', 'fit_reason', 'notified_at',
    ];

    protected $casts = [
        'posted_at' => 'datetime',
        'notified_at' => 'datetime',
        'fit_score' => 'integer',
    ];

    public function jobSearch(): BelongsTo
    {
        return $this->belongsTo(JobSearch::class);
    }
}
