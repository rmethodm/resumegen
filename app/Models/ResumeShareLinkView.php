<?php

namespace App\Models;

use Database\Factories\ResumeShareLinkViewFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResumeShareLinkView extends Model
{
    /** @use HasFactory<ResumeShareLinkViewFactory> */
    use HasFactory;

    /**
     * `resume_share_link_id` is deliberately absent: set through the
     * relation, never from request input.
     */
    protected $fillable = [
        'email',
        'ip_hash',
    ];

    /**
     * @return BelongsTo<ResumeShareLink, $this>
     */
    public function shareLink(): BelongsTo
    {
        return $this->belongsTo(ResumeShareLink::class, 'resume_share_link_id');
    }
}
