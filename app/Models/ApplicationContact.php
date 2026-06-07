<?php

namespace App\Models;

use Database\Factories\ApplicationContactFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApplicationContact extends Model
{
    /** @use HasFactory<ApplicationContactFactory> */
    use HasFactory;

    protected $fillable = ['job_application_id', 'user_id', 'name', 'role', 'email', 'phone', 'notes'];

    public function jobApplication(): BelongsTo
    {
        return $this->belongsTo(JobApplication::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
