<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResumeQuestion extends Model
{
    protected $fillable = [
        'resume_share_link_id', 'resume_id',
        'sender_name', 'sender_email', 'sender_phone', 'message', 'is_read',
    ];

    protected $casts = ['is_read' => 'boolean'];

    public function shareLink(): BelongsTo
    {
        return $this->belongsTo(ResumeShareLink::class, 'resume_share_link_id');
    }

    public function resume(): BelongsTo
    {
        return $this->belongsTo(Resume::class);
    }
}
