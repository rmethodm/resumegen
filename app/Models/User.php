<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Cashier\Billable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'has_completed_onboarding', 'is_master_admin', 'is_pro', 'plan_tier'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use Billable, HasApiTokens, HasFactory, Notifiable;

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'has_completed_onboarding' => 'boolean',
            'is_master_admin' => 'boolean',
            'is_pro' => 'boolean',
            'plan_tier' => 'string',
        ];
    }

    public function isPro(): bool
    {
        return $this->planTier() === 'pro' || $this->subscribed('default');
    }

    public function planTier(): string
    {
        if ($this->is_master_admin || $this->is_pro) {
            return 'pro';
        }

        return $this->plan_tier ?? 'free';
    }

    public function isAtLeastStarter(): bool
    {
        return in_array($this->planTier(), ['starter', 'pro'], true);
    }

    public function resumes(): HasMany
    {
        return $this->hasMany(Resume::class);
    }

    public function coverLetters(): HasMany
    {
        return $this->hasMany(CoverLetter::class);
    }

    public function jobApplications(): HasMany
    {
        return $this->hasMany(JobApplication::class);
    }
}
