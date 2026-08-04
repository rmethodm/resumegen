<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'has_completed_onboarding', 'two_factor_secret', 'two_factor_recovery_codes', 'two_factor_confirmed_at', 'profile', 'stale_nudge_sent_at', 'view_nudge_sent_at', 'preferred_template', 'target_role', 'industry', 'years_experience', 'registration_ip'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

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
     * Support-admin actions taken against this user (append-only).
     *
     * @return HasMany<AdminActionLog, $this>
     */
    public function adminActionLogsAsTarget(): HasMany
    {
        return $this->hasMany(AdminActionLog::class, 'target_user_id');
    }

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'has_completed_onboarding' => 'boolean',
            'is_admin' => 'boolean',
            'disabled_at' => 'datetime',
            'two_factor_secret' => 'encrypted',
            'two_factor_recovery_codes' => 'encrypted:array',
            'two_factor_confirmed_at' => 'datetime',
            'profile' => 'array',
            'view_nudge_sent_at' => 'datetime',
        ];
    }

    public function hasTwoFactorEnabled(): bool
    {
        return $this->two_factor_confirmed_at !== null;
    }

    public function isAdmin(): bool
    {
        return (bool) $this->is_admin;
    }

    public function isDisabled(): bool
    {
        return $this->disabled_at !== null;
    }
}
