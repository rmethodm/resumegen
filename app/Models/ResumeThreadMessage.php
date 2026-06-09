<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResumeThreadMessage extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['thread_id', 'body', 'is_owner'];

    protected $casts = ['is_owner' => 'boolean'];

    public function thread(): BelongsTo
    {
        return $this->belongsTo(ResumeThread::class, 'thread_id');
    }
}
