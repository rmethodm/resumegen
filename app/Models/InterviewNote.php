<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InterviewNote extends Model
{
    public $timestamps = false;

    protected $fillable = ['job_application_id', 'body'];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function jobApplication(): BelongsTo
    {
        return $this->belongsTo(JobApplication::class);
    }
}
