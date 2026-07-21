<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'has_completed_onboarding', 'two_factor_secret', 'two_factor_recovery_codes', 'two_factor_confirmed_at', 'profile', 'stale_nudge_sent_at', 'view_nudge_sent_at', 'preferred_template', 'portfolio_slug', 'portfolio_headline', 'portfolio_bio', 'portfolio_is_public', 'portfolio_links', 'target_role', 'industry', 'years_experience', 'registration_ip'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected static function booted(): void
    {
        static::deleting(function (User $user): void {
            // The resumes.user_id FK would cascade these rows away without
            // firing model events, so Resume's `deleting` observer — which
            // unlinks thumbnails and recurses A/B variants — would never run.
            $user->resumes->each->delete();
        });
    }

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'has_completed_onboarding' => 'boolean',
            'two_factor_secret' => 'encrypted',
            'two_factor_recovery_codes' => 'encrypted:array',
            'two_factor_confirmed_at' => 'datetime',
            'profile' => 'array',
            'portfolio_is_public' => 'boolean',
            'portfolio_links' => 'array',
            'view_nudge_sent_at' => 'datetime',
        ];
    }

    public function hasTwoFactorEnabled(): bool
    {
        return $this->two_factor_confirmed_at !== null;
    }

    public function resumes(): HasMany
    {
        return $this->hasMany(Resume::class);
    }

    public function coverLetters(): HasMany
    {
        return $this->hasMany(CoverLetter::class);
    }

    public function portfolioMessages(): HasMany
    {
        return $this->hasMany(PortfolioMessage::class);
    }
}
