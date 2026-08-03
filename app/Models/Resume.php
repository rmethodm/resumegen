<?php

namespace App\Models;

use Database\Factories\ResumeFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property list<string>|null $section_order
 */
class Resume extends Model
{
    /** @use HasFactory<ResumeFactory> */
    use HasFactory;

    /**
     * Every section the builder knows about, in the order a resume shows them
     * until the user reorders. `contact` is the header, so it is not
     * reorderable — it is listed for the section rail, not the document body.
     *
     * @var list<string>
     */
    public const SECTIONS = [
        'contact',
        'summary',
        'experience',
        'project',
        'education',
        'skills',
        'certificate',
    ];

    protected $fillable = [
        'group_id',
        'title',
        'target_role',
        'target_company',
        'full_name',
        'headline',
        'email',
        'phone',
        'location',
        'linkedin',
        'website',
        'summary',
        'template',
        'font',
        'density',
        'skills_layout',
        'section_order',
        'import_state',
        'import_error',
    ];

    /**
     * The stored order, repaired against {@see SECTIONS} so a section added to
     * the app later still appears for resumes saved before it existed.
     *
     * @return list<string>
     */
    public function sectionOrder(): array
    {
        $stored = array_values(array_intersect($this->section_order ?? [], self::SECTIONS));

        return [...$stored, ...array_values(array_diff(self::SECTIONS, $stored))];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<ResumeGroup, $this>
     */
    public function group(): BelongsTo
    {
        return $this->belongsTo(ResumeGroup::class, 'group_id');
    }

    /**
     * @return HasMany<Experience, $this>
     */
    public function experiences(): HasMany
    {
        return $this->hasMany(Experience::class)->orderBy('position');
    }

    /**
     * @return HasMany<Skill, $this>
     */
    public function skills(): HasMany
    {
        return $this->hasMany(Skill::class)->orderBy('position');
    }

    /**
     * @return HasMany<Project, $this>
     */
    public function projects(): HasMany
    {
        return $this->hasMany(Project::class)->orderBy('position');
    }

    /**
     * @return HasMany<Education, $this>
     */
    public function education(): HasMany
    {
        return $this->hasMany(Education::class)->orderBy('position');
    }

    /**
     * @return HasMany<Certificate, $this>
     */
    public function certificates(): HasMany
    {
        return $this->hasMany(Certificate::class)->orderBy('position');
    }

    /**
     * Private canvas reminders for this version. Not part of the document —
     * see {@see ResumeNote} and the resume_notes migration.
     *
     * @return HasMany<ResumeNote, $this>
     */
    public function notes(): HasMany
    {
        return $this->hasMany(ResumeNote::class);
    }

    /**
     * @return HasMany<ResumeSnapshot, $this>
     */
    public function snapshots(): HasMany
    {
        return $this->hasMany(ResumeSnapshot::class)->latest();
    }

    /**
     * The public read-only share link for this resume, if one has been
     * generated. Publication metadata, not part of the document — see the
     * note in ResumeDocument::save().
     *
     * @return HasOne<ResumeShareLink, $this>
     */
    public function shareLink(): HasOne
    {
        return $this->hasOne(ResumeShareLink::class);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'section_order' => 'array',
        ];
    }

    /**
     * Every resume belongs to a version group. When one is created without an
     * explicit group (the normal case — starter seed, import, factory), start a
     * fresh single-version group named after it. Duplicate sets group_id itself
     * to add a sibling, so this leaves an explicit value alone.
     */
    protected static function booted(): void
    {
        static::creating(function (Resume $resume): void {
            if ($resume->group_id === null) {
                $resume->group_id = ResumeGroup::create([
                    'user_id' => $resume->user_id,
                    'title' => $resume->title !== '' && $resume->title !== null
                        ? $resume->title
                        : 'Untitled resume',
                ])->id;
            }
        });
    }
}
