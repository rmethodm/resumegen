<?php

namespace App\Models;

use Database\Factories\ResumeShareLinkFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class ResumeShareLink extends Model
{
    /** @use HasFactory<ResumeShareLinkFactory> */
    use HasFactory;

    protected $fillable = ['resume_id', 'token', 'label', 'is_active', 'expires_at', 'is_primary', 'password_hash', 'views_seen_at'];

    protected $hidden = ['password_hash'];

    protected $casts = [
        'is_active' => 'boolean',
        'is_primary' => 'boolean',
        'expires_at' => 'datetime',
        'views_seen_at' => 'datetime',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'allow_download' => 'boolean',
            'require_email' => 'boolean',
            'require_password' => 'boolean',
            'password' => 'encrypted',
            'expires_at' => 'datetime',
        ];
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    /**
     * @return BelongsTo<Resume, $this>
     */
    public function resume(): BelongsTo
    {
        return $this->belongsTo(Resume::class);
    }

    /**
     * @return HasMany<ResumeShareLinkView, $this>
     */
    public function views(): HasMany
    {
        return $this->hasMany(ResumeShareLinkView::class);
    }

    protected static function booted(): void
    {
        static::creating(function (ResumeShareLink $link): void {
            $link->token ??= Str::random(40);
        });
    }
}
