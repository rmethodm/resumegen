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

    /**
     * `resume_id` and `token` are deliberately absent: the link's owner is
     * the route-bound resume, set through the relation, and the token is
     * generated on creation, never accepted from request input.
     */
    protected $fillable = [
        'allow_download',
        'require_email',
        'require_password',
        'password',
        'expires_at',
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
