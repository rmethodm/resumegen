<?php

namespace App\Http\Controllers;

use App\Models\CareerArticle;
use Inertia\Inertia;
use Inertia\Response;

class CareerHubController extends Controller
{
    public function index(): Response
    {
        $articles = CareerArticle::query()
            ->where('is_published', true)
            ->orderByDesc('published_at')
            ->get(['id', 'title', 'slug', 'category', 'reading_time_minutes', 'published_at']);

        return Inertia::render('CareerHub/Index', [
            'articles' => $articles,
            'categories' => CareerArticle::CATEGORIES,
        ]);
    }

    public function show(string $slug): Response
    {
        $article = CareerArticle::query()
            ->where('slug', $slug)
            ->where('is_published', true)
            ->firstOrFail();

        return Inertia::render('CareerHub/Show', [
            'article' => $article,
        ]);
    }
}
