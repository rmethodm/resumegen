<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdminAuditLog extends Model
{
    /** @use HasFactory<\Database\Factories\AdminAuditLogFactory> */
    use HasFactory;

    public const UPDATED_AT = null; // append-only, no updated_at column

    protected $fillable = [
        'admin_user_id',
        'action',
        'target_type',
        'target_id',
        'description',
        'meta',
        'ip_address',
    ];

    protected function casts(): array
    {
        return [
            'meta' => 'array',
        ];
    }

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_user_id');
    }

    /**
     * Record a privileged admin action. Best-effort: never breaks the action it logs.
     *
     * @param  array<string, mixed>  $meta
     */
    public static function record(string $action, ?Model $target, string $description, array $meta = []): void
    {
        try {
            self::create([
                'admin_user_id' => auth()->id(),
                'action' => $action,
                'target_type' => $target ? $target::class : null,
                'target_id' => $target?->getKey(),
                'description' => $description,
                'meta' => $meta ?: null,
                'ip_address' => request()->ip(),
            ]);
        } catch (\Throwable) {
            // Auditing is best-effort; never break the underlying admin action.
        }
    }
}
