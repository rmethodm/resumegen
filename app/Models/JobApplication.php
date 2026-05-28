<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobApplication extends Model
{
    use HasFactory;

    public const STATUSES = ['saved', 'applied', 'interviewing', 'offered', 'rejected', 'closed'];

    protected $fillable = [
        'user_id', 'resume_id', 'company', 'role', 'status', 'applied_at', 'notes', 'job_url',
    ];

    protected $casts = [
        'applied_at' => 'date',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function resume(): BelongsTo
    {
        return $this->belongsTo(Resume::class);
    }
}
