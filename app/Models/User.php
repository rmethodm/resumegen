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
use Laravel\Cashier\Billable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'has_completed_onboarding', 'is_master_admin', 'is_pro', 'plan_tier', 'two_factor_secret', 'two_factor_recovery_codes', 'two_factor_confirmed_at', 'profile', 'stale_nudge_sent_at', 'view_nudge_sent_at', 'preferred_template', 'portfolio_slug', 'portfolio_headline', 'portfolio_bio', 'portfolio_is_public', 'portfolio_links', 'target_role', 'industry', 'years_experience', 'ai_limit_override', 'ai_blocked', 'ai_usage_reset_at', 'registration_ip'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable implements FilamentUser, MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use Billable, HasApiTokens, HasFactory, Notifiable;

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
            'is_pro' => 'boolean',
            'plan_tier' => 'string',
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

    public function isPro(): bool
    {
        return $this->is_master_admin
            || in_array($this->planTier(), ['pro', 'agency'], true)
            || $this->subscribed('default');
    }

    public function canAccessPanel(Panel $panel): bool
    {
        return (bool) $this->is_master_admin;
    }

    public function planTier(): string
    {
        if ($this->is_master_admin) {
            return 'agency';
        }

        if ($this->is_pro) {
            return 'pro';
        }

        return $this->plan_tier ?? 'free';
    }

    public function isAtLeastStarter(): bool
    {
        return in_array($this->planTier(), ['starter', 'pro', 'agency'], true);
    }

    public function hasTwoFactorEnabled(): bool
    {
        return $this->two_factor_confirmed_at !== null;
    }

    public function requiresTwoFactor(): bool
    {
        return $this->planTier() === 'pro' && ! $this->hasTwoFactorEnabled();
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

    public function resignationLetters(): HasMany
    {
        return $this->hasMany(ResignationLetter::class);
    }

    public function proofreadingRequests(): HasMany
    {
        return $this->hasMany(ProofreadingRequest::class);
    }

    public function webhookEndpoints(): HasMany
    {
        return $this->hasMany(WebhookEndpoint::class);
    }

    public function portfolioMessages(): HasMany
    {
        return $this->hasMany(PortfolioMessage::class);
    }
}
