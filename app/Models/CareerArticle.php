<?php

namespace App\Models;

use Database\Factories\CareerArticleFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

#[Fillable(['title', 'slug', 'body', 'category', 'meta_description', 'reading_time_minutes', 'is_published', 'published_at'])]
class CareerArticle extends Model
{
    /** @use HasFactory<CareerArticleFactory> */
    use HasFactory;

    public const CATEGORIES = [
        'Resume Tips',
        'Job Search',
        'Interviews',
        'Salary & Negotiation',
        'Career Growth',
    ];

    protected $casts = [
        'is_published' => 'boolean',
        'published_at' => 'datetime',
    ];

    public static function sanitizeBody(string $html): string
    {
        $allowed = '<p><br><strong><em><u><s><ul><ol><li><h2><h3><h4><blockquote><a><img><code><pre>';
        $clean = strip_tags($html, $allowed);
        // Remove event handler attributes (onclick, onload, onerror, etc.)
        $clean = preg_replace('/\s+on\w+\s*=\s*["\'][^"\']*["\']/i', '', $clean);
        // Remove javascript: href/src
        $clean = preg_replace('/\b(href|src)\s*=\s*["\']javascript:[^"\']*["\']/i', '', $clean);

        return $clean;
    }

    protected static function booted(): void
    {
        static::creating(function (CareerArticle $article) {
            if (! $article->slug) {
                $article->slug = Str::slug($article->title);
            }

            $article->reading_time_minutes = (int) ceil(str_word_count(strip_tags($article->body)) / 200) ?: 1;

            if ($article->is_published && ! $article->published_at) {
                $article->published_at = now();
            }
        });

        static::updating(function (CareerArticle $article) {
            if ($article->isDirty('body')) {
                $article->reading_time_minutes = (int) ceil(str_word_count(strip_tags($article->body)) / 200) ?: 1;
            }

            if ($article->isDirty('is_published') && $article->is_published && ! $article->published_at) {
                $article->published_at = now();
            }
        });
    }
}
