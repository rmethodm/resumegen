<?php

namespace App\Models;

use App\Services\JobBoards\JobQuery;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JobSearch extends Model
{
    use HasFactory;

    protected $fillable = ['user_id', 'resume_id', 'label', 'keywords', 'location', 'scope', 'is_alerting', 'last_run_at'];

    protected $casts = [
        'is_alerting' => 'boolean',
        'last_run_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function resume(): BelongsTo
    {
        return $this->belongsTo(Resume::class);
    }

    public function listings(): HasMany
    {
        return $this->hasMany(JobListing::class);
    }

    public function toQuery(): JobQuery
    {
        return new JobQuery($this->keywords, $this->location ?? '', $this->scope);
    }
}
