<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class ResumeShareLink extends Model
{
    use HasFactory;
    protected $fillable = ['resume_id', 'token', 'label', 'is_active', 'expires_at'];

    protected $casts = [
        'is_active'  => 'boolean',
        'expires_at' => 'datetime',
    ];

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

    public function events(): HasMany
    {
        return $this->hasMany(ResumeShareEvent::class);
    }
}
