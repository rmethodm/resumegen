<?php

namespace App\Models;

use Database\Factories\StarterProfileFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A reusable seed for resume *content* — distinct from the account profile
 * (settings/profile). One row per user.
 *
 * @property int $id
 * @property int $user_id
 * @property string|null $full_name
 * @property string|null $headline
 * @property string|null $email
 * @property string|null $phone
 * @property string|null $location
 * @property string|null $target_role
 * @property string|null $linkedin
 * @property string|null $website
 * @property list<array{title: string, company: string, start_date: string, end_date: string, is_current: bool, bullets: list<string>}>|null $experience_snapshot
 * @property list<array{category: string, name: string}>|null $skills
 */
#[Fillable([
    'full_name', 'headline', 'email', 'phone', 'location', 'target_role',
    'linkedin', 'website', 'experience_snapshot', 'skills', 'user_id',
])]
class StarterProfile extends Model
{
    /** @use HasFactory<StarterProfileFactory> */
    use HasFactory;

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'experience_snapshot' => 'array',
            'skills' => 'array',
        ];
    }
}
