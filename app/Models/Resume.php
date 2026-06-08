<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

class Resume extends Model implements HasMedia
{
    use HasFactory, InteractsWithMedia;

    protected static function booted(): void
    {
        static::deleting(function (Resume $resume): void {
            // Delete A/B variants — they are meaningless without the parent
            $resume->abVariants()->delete();
            // Delete snapshots — they are versions of this specific resume
            $resume->snapshots()->delete();
        });
    }

    protected $fillable = [
        'user_id',
        'name', 'pdf_filename', 'template',
        'accent_color', 'font_family',
        'contact', 'summary', 'experience', 'education',
        'skills', 'certifications', 'font_sizes',
        'ats_cache', 'ats_cached_at',
        'section_order', 'custom_sections',
        'ab_parent_id',
        'master_resume_id',
        'is_master',
        'master_synced_at',
        'job_application_id',
    ];

    protected $casts = [
        'is_snapshot' => 'boolean',
        'is_master' => 'boolean',
        'contact' => 'array',
        'experience' => 'array',
        'education' => 'array',
        'skills' => 'array',
        'certifications' => 'array',
        'font_sizes' => 'array',
        'ats_cache' => 'array',
        'ats_cached_at' => 'datetime',
        'master_synced_at' => 'datetime',
        'section_order' => 'array',
        'custom_sections' => 'array',
    ];

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('photo')
            ->singleFile()
            ->acceptsMimeTypes(['image/jpeg', 'image/png', 'image/webp']);
    }

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

    public function tags(): HasMany
    {
        return $this->hasMany(ResumeTag::class)->orderBy('created_at');
    }

    public function abParent(): BelongsTo
    {
        return $this->belongsTo(Resume::class, 'ab_parent_id');
    }

    public function abVariants(): HasMany
    {
        return $this->hasMany(Resume::class, 'ab_parent_id');
    }

    public function masterResume(): BelongsTo
    {
        return $this->belongsTo(Resume::class, 'master_resume_id');
    }

    public function tailoredCopies(): HasMany
    {
        return $this->hasMany(Resume::class, 'master_resume_id');
    }

    public function linkedJob(): BelongsTo
    {
        return $this->belongsTo(JobApplication::class, 'job_application_id');
    }
}
