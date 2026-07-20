<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Filament\Models\Contracts\FilamentUser;
use Filament\Panel;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'has_completed_onboarding', 'is_master_admin', 'two_factor_secret', 'two_factor_recovery_codes', 'two_factor_confirmed_at', 'profile', 'stale_nudge_sent_at', 'view_nudge_sent_at', 'preferred_template', 'portfolio_slug', 'portfolio_headline', 'portfolio_bio', 'portfolio_is_public', 'portfolio_links', 'target_role', 'industry', 'years_experience', 'ai_limit_override', 'ai_blocked', 'ai_usage_reset_at', 'registration_ip'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable implements FilamentUser, MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'ai_blocked' => false,
    ];

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
            'is_master_admin' => 'boolean',
            'two_factor_secret' => 'encrypted',
            'two_factor_recovery_codes' => 'encrypted:array',
            'two_factor_confirmed_at' => 'datetime',
            'profile' => 'array',
            'portfolio_is_public' => 'boolean',
            'portfolio_links' => 'array',
            'ai_blocked' => 'boolean',
            'ai_usage_reset_at' => 'datetime',
            'view_nudge_sent_at' => 'datetime',
        ];
    }

    public function canAccessPanel(Panel $panel): bool
    {
        return (bool) $this->is_master_admin;
    }

    public function hasTwoFactorEnabled(): bool
    {
        return $this->two_factor_confirmed_at !== null;
    }

    public function resumes(): HasMany
    {
        return $this->hasMany(Resume::class);
    }

    /**
     * @return HasMany<AiRequest, $this>
     */
    public function aiRequests(): HasMany
    {
        return $this->hasMany(AiRequest::class);
    }

    public function coverLetters(): HasMany
    {
        return $this->hasMany(CoverLetter::class);
    }

    public function portfolioMessages(): HasMany
    {
        return $this->hasMany(PortfolioMessage::class);
    }

    /**
     * @return HasMany<BalanceTransaction, $this>
     */
    public function balanceTransactions(): HasMany
    {
        return $this->hasMany(BalanceTransaction::class);
    }

    /**
     * @return HasMany<JobPairing, $this>
     */
    public function jobPairings(): HasMany
    {
        return $this->hasMany(JobPairing::class);
    }

    /**
     * The ledger is the balance — there is deliberately no cached column to drift.
     *
     * ponytail: SUM over an indexed per-user ledger is fine at hundreds of rows.
     * Cache it if it shows up in profiling, not before.
     */
    public function balanceCents(): int
    {
        return (int) $this->balanceTransactions()->sum('amount_cents');
    }
}
