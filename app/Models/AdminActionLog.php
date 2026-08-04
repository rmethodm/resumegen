<?php

namespace App\Models;

use Database\Factories\AdminActionLogFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdminActionLog extends Model
{
    /** @use HasFactory<AdminActionLogFactory> */
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'actor_id',
        'target_user_id',
        'action',
        'meta',
        'created_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'meta' => 'array',
            'created_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function targetUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'target_user_id');
    }

    /**
     * @param  array<string, mixed>|null  $meta
     */
    public static function record(User $actor, ?User $target, string $action, ?array $meta = null): self
    {
        return self::query()->create([
            'actor_id' => $actor->id,
            'target_user_id' => $target?->id,
            'action' => $action,
            'meta' => $meta,
            'created_at' => now(),
        ]);
    }
}
