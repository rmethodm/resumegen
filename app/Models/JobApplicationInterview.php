<?php

namespace App\Models;

use Database\Factories\JobApplicationInterviewFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A single interview round logged against a job application.
 *
 * @property int $id
 * @property int $job_application_id
 * @property int $round
 * @property Carbon|null $scheduled_at
 * @property string|null $type
 * @property string|null $notes
 */
#[Fillable(['job_application_id', 'round', 'scheduled_at', 'type', 'notes'])]
class JobApplicationInterview extends Model
{
    /** @use HasFactory<JobApplicationInterviewFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<JobApplication, $this>
     */
    public function jobApplication(): BelongsTo
    {
        return $this->belongsTo(JobApplication::class);
    }
}
