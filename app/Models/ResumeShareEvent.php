<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Http\Request;

class ResumeShareEvent extends Model
{
    public const UPDATED_AT = null; // append-only, no updated_at column

    protected $fillable = [
        'resume_share_link_id',
        'resume_id',
        'event',
        'ip_hash',
        'user_agent',
        'referrer',
    ];

    public function shareLink(): BelongsTo
    {
        return $this->belongsTo(ResumeShareLink::class, 'resume_share_link_id');
    }

    public function resume(): BelongsTo
    {
        return $this->belongsTo(Resume::class);
    }

    /**
     * Log a single event from an incoming HTTP request.
     */
    public static function log(Request $request, ResumeShareLink $link, string $event): void
    {
        $ip = $request->ip();

        try {
            self::create([
                'resume_share_link_id' => $link->id,
                'resume_id'            => $link->resume_id,
                'event'                => $event,
                'ip_hash'              => $ip ? hash('sha256', $ip) : null,
                'user_agent'           => substr((string) $request->userAgent(), 0, 500) ?: null,
                'referrer'             => substr((string) $request->header('referer', ''), 0, 500) ?: null,
            ]);
        } catch (\Throwable) {
            // Analytics logging is best-effort; never crash a public request
        }
    }
}
