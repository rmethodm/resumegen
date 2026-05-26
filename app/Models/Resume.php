<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Resume extends Model
{
    protected $fillable = [
        'user_id', 'name', 'pdf_filename', 'template',
        'contact', 'summary', 'experience', 'education',
        'skills', 'certifications',
    ];

    protected $casts = [
        'contact'        => 'array',
        'experience'     => 'array',
        'education'      => 'array',
        'skills'         => 'array',
        'certifications' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function shareLinks(): HasMany
    {
        return $this->hasMany(ResumeShareLink::class)->latest();
    }

    public function questions(): HasMany
    {
        return $this->hasMany(ResumeQuestion::class)->latest();
    }
}
