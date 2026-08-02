<?php

namespace App\Models;

use Database\Factories\ResumeGroupFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ResumeGroup extends Model
{
    /** @use HasFactory<ResumeGroupFactory> */
    use HasFactory;

    protected $fillable = ['user_id', 'title'];

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return HasMany<Resume, $this>
     */
    public function resumes(): HasMany
    {
        return $this->hasMany(Resume::class, 'group_id')->orderBy('id');
    }
}
