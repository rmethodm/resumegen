<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Resume extends Model
{
    use HasFactory;

    protected static function booted(): void
    {
        static::saving(function (Resume $resume): void {
            $flatten = function ($value) use (&$flatten): array {
                if (is_array($value)) {
                    return collect($value)->flatMap($flatten)->all();
                }

                return is_scalar($value) ? [(string) $value] : [];
            };

            $resume->search_text = collect([
                $resume->name,
                $resume->summary,
                $resume->experience,
                $resume->education,
                $resume->projects,
                $resume->skills,
                $resume->skills_groups,
                $resume->certifications,
                $resume->custom_sections,
            ])->flatMap($flatten)->filter()->implode(' ');

            $resume->search_text = mb_strtolower($resume->search_text);
        });

        static::deleting(function (Resume $resume): void {
            @unlink(storage_path("app/thumbnails/{$resume->id}.png"));
        });
    }

    protected $fillable = [
        'user_id',
        'name', 'search_text', 'pdf_filename', 'template',
        'accent_color', 'font_family',
        'contact', 'summary', 'target_job_description', 'target_company', 'target_title', 'experience', 'education', 'projects',
        'skills', 'skills_layout', 'skills_groups', 'skill_narratives', 'certifications', 'font_sizes',
        'section_order', 'custom_sections',
        'is_snapshot',
        'parent_resume_id',
    ];

    protected $casts = [
        'contact' => 'array',
        'experience' => 'array',
        'education' => 'array',
        'skills' => 'array',
        'skills_groups' => 'array',
        'skill_narratives' => 'array',
        'certifications' => 'array',
        'projects' => 'array',
        'font_sizes' => 'array',
        'section_order' => 'array',
        'custom_sections' => 'array',
        'is_snapshot' => 'boolean',
    ];

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

    public function sectionEvents(): HasMany
    {
        return $this->hasMany(ResumeSectionEvent::class);
    }

    public function tags(): HasMany
    {
        return $this->hasMany(ResumeTag::class)->orderBy('created_at');
    }
}
