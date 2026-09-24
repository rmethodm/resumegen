<?php

namespace App\Models;

use App\Notifications\QueuedResetPassword;
use App\Notifications\QueuedVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Cashier\Billable;
use Laravel\Sanctum\HasApiTokens;

// 2FA fields are deliberately absent: every write is a direct property
// assignment + save() from app code, never from request-controlled input, so
// they should never be mass-assignable.
#[Fillable(['name', 'email', 'password', 'has_completed_onboarding', 'profile', 'stale_nudge_sent_at', 'view_nudge_sent_at', 'preferred_template', 'target_role', 'industry', 'years_experience', 'registration_ip', 'oauth_provider', 'oauth_provider_id', 'prefers_apply_wizard', 'dismissed_checklist_at'])]
// Hidden is the backstop for any place a whole User gets serialized (Inertia
// props, JSON responses): 2FA secrets, billing identifiers, and the signup IP
// must never reach a client.
#[Hidden([
    'password',
    'remember_token',
    'two_factor_secret',
    'two_factor_recovery_codes',
    'stripe_id',
    'pm_type',
    'pm_last_four',
    'trial_ends_at',
    'registration_ip',
    'oauth_provider_id',
])]
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use Billable, HasApiTokens, HasFactory, Notifiable;

    /**
     * @return HasMany<Resume, $this>
     */
    public function resumes(): HasMany
    {
        return $this->hasMany(Resume::class);
    }

    /**
     * The reusable content seed for this user's resumes. One row at most —
     * the unique user_id on starter_profiles is what makes this a hasOne.
     *
     * @return HasOne<StarterProfile, $this>
     */
    public function starterProfile(): HasOne
    {
        return $this->hasOne(StarterProfile::class);
    }

    /**
     * @return HasMany<JobApplication, $this>
     */
    public function jobApplications(): HasMany
    {
        return $this->hasMany(JobApplication::class);
    }

    /**
     * @return HasMany<JobPoolEntry, $this>
     */
    public function jobPoolEntries(): HasMany
    {
        return $this->hasMany(JobPoolEntry::class);
    }

    /**
     * @return HasMany<AiRequest, $this>
     */
    public function aiRequests(): HasMany
    {
        return $this->hasMany(AiRequest::class);
    }

    /**
     * @return HasMany<AiCreditLedgerEntry, $this>
     */
    public function aiCreditLedger(): HasMany
    {
        return $this->hasMany(AiCreditLedgerEntry::class);
    }

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'has_completed_onboarding' => 'boolean',
            'is_read_only' => 'boolean',
            'is_admin' => 'boolean',
            'disabled_at' => 'datetime',
            'two_factor_secret' => 'encrypted',
            'two_factor_recovery_codes' => 'encrypted:array',
            'two_factor_confirmed_at' => 'datetime',
            'profile' => 'array',
            'stale_nudge_sent_at' => 'datetime',
            'view_nudge_sent_at' => 'datetime',
            'ai_blocked' => 'boolean',
            'ai_usage_reset_at' => 'datetime',
            'ai_starter_credits_granted_at' => 'datetime',
            'prefers_apply_wizard' => 'boolean',
            'dismissed_checklist_at' => 'datetime',
        ];
    }

    /**
     * Queued so a slow mail provider never holds up registration or the
     * resend-verification request.
     */
    public function sendEmailVerificationNotification(): void
    {
        $this->notify(new QueuedVerifyEmail);
    }

    /**
     * Queued so a slow mail provider never holds up the forgot-password request.
     *
     * @param  string  $token
     */
    public function sendPasswordResetNotification(#[\SensitiveParameter] $token): void
    {
        $this->notify(new QueuedResetPassword($token));
    }

    public function hasTwoFactorEnabled(): bool
    {
        return $this->two_factor_confirmed_at !== null;
    }

    public function isDisabled(): bool
    {
        return $this->disabled_at !== null;
    }

    public function isReadOnly(): bool
    {
        return (bool) $this->is_read_only;
    }
}
