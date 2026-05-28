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
        'user_id', 'name', 'pdf_filename', 'template',
        'contact', 'summary', 'experience', 'education',
        'skills', 'certifications', 'font_sizes',
    ];

    protected $casts = [
        'contact'        => 'array',
        'experience'     => 'array',
        'education'      => 'array',
        'skills'         => 'array',
        'certifications' => 'array',
        'font_sizes'     => 'array',
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
}
