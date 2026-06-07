<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Resume extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name', 'pdf_filename', 'template',
        'accent_color', 'font_family',
        'contact', 'summary', 'experience', 'education',
        'skills', 'certifications', 'font_sizes',
        'ats_cache', 'ats_cached_at',
        'section_order', 'custom_sections',
    ];

    protected $casts = [
        'is_snapshot' => 'boolean',
        'contact' => 'array',
        'experience' => 'array',
        'education' => 'array',
        'skills' => 'array',
        'certifications' => 'array',
        'font_sizes' => 'array',
        'ats_cache' => 'array',
        'ats_cached_at' => 'datetime',
        'section_order' => 'array',
        'custom_sections' => 'array',
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

    public function shareEvents(): HasMany
    {
        return $this->hasMany(ResumeShareEvent::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Resume::class, 'parent_resume_id');
    }

    public function snapshots(): HasMany
    {
        return $this->hasMany(Resume::class, 'parent_resume_id')->orderByDesc('created_at');
    }
}
