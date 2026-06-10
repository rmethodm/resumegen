<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
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
            $resume->abVariants()->delete();
            $resume->threads()->delete();
        });
    }

    protected $fillable = [
        'user_id',
        'name', 'pdf_filename', 'template',
        'accent_color', 'font_family',
        'contact', 'summary', 'experience', 'education',
        'skills', 'skills_layout', 'skills_groups', 'certifications', 'font_sizes',
        'section_order', 'custom_sections',
        'ab_parent_id',
        'job_application_id',
        'is_snapshot',
        'is_master',
        'master_resume_id',
        'master_synced_at',
        'parent_resume_id',
    ];

    protected $casts = [
        'contact' => 'array',
        'experience' => 'array',
        'education' => 'array',
        'skills' => 'array',
        'skills_groups' => 'array',
        'certifications' => 'array',
        'font_sizes' => 'array',
        'section_order' => 'array',
        'custom_sections' => 'array',
        'is_snapshot' => 'boolean',
        'is_master' => 'boolean',
        'master_synced_at' => 'datetime',
    ];

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('photo')
            ->singleFile()
            ->acceptsMimeTypes(['image/jpeg', 'image/png', 'image/webp']);
    }

    public function scopeNonSnapshot(Builder $query): Builder
    {
        return $query->where('is_snapshot', false);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function shareLinks(): HasMany
    {
        return $this->hasMany(ResumeShareLink::class)->latest();
    }

    public function threads(): HasMany
    {
        return $this->hasMany(ResumeThread::class)->latest();
    }

    public function shareEvents(): HasMany
    {
        return $this->hasMany(ResumeShareEvent::class);
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

    public function linkedJob(): BelongsTo
    {
        return $this->belongsTo(JobApplication::class, 'job_application_id');
    }
}
