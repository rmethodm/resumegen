<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class ResumeShareLink extends Model
{
    protected $fillable = ['resume_id', 'token', 'label', 'is_active'];

    protected $casts = ['is_active' => 'boolean'];

    protected $attributes = [
        'is_active' => true,
    ];

    protected static function booted(): void
    {
        static::creating(function (self $link) {
            $link->token ??= Str::random(48);
        });
    }

    public function resume(): BelongsTo
    {
        return $this->belongsTo(Resume::class);
    }

    public function questions(): HasMany
    {
        return $this->hasMany(ResumeQuestion::class);
    }
}
