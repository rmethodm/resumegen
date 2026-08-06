<?php

namespace App\Models;

use Database\Factories\JobApplicationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A job the user is tracking through the application pipeline, managed
 * from the Job Application Kanban board.
 *
 * @property int $id
 * @property int $user_id
 * @property int|null $resume_id
 * @property string $company
 * @property string $role
 * @property string $status
 * @property Carbon|null $applied_at
 * @property Carbon|null $follow_up_at
 * @property string|null $notes
 * @property string|null $job_url
 */
#[Fillable([
    'user_id', 'resume_id', 'company', 'role', 'status',
    'applied_at', 'follow_up_at', 'notes', 'job_url',
])]
class JobApplication extends Model
{
    /** @use HasFactory<JobApplicationFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'applied_at' => 'date',
            'follow_up_at' => 'date',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<Resume, $this>
     */
    public function resume(): BelongsTo
    {
        return $this->belongsTo(Resume::class);
    }
}
