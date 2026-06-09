<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ResumeThread extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'resume_id', 'share_link_id',
        'sender_name', 'sender_email', 'is_read',
    ];

    protected $casts = ['is_read' => 'boolean'];

    public function resume(): BelongsTo
    {
        return $this->belongsTo(Resume::class);
    }

    public function shareLink(): BelongsTo
    {
        return $this->belongsTo(ResumeShareLink::class, 'share_link_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(ResumeThreadMessage::class, 'thread_id')->orderBy('created_at');
    }

    public function latestMessage(): HasMany
    {
        return $this->hasMany(ResumeThreadMessage::class, 'thread_id')->latest('created_at')->limit(1);
    }
}
