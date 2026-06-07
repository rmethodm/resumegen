<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CareerArticle;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CareerController extends Controller
{
    public function index(): Response
    {
        $articles = CareerArticle::query()
            ->orderByDesc('updated_at')
            ->get(['id', 'title', 'slug', 'category', 'is_published', 'published_at', 'updated_at']);

        return Inertia::render('Admin/Career/Index', [
            'articles' => $articles,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Career/Edit', [
            'article' => null,
            'categories' => CareerArticle::CATEGORIES,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:career_articles,slug'],
            'body' => ['required', 'string'],
            'category' => ['required', 'string', 'in:'.implode(',', CareerArticle::CATEGORIES)],
            'meta_description' => ['nullable', 'string', 'max:255'],
            'is_published' => ['boolean'],
        ]);

        CareerArticle::create($validated);

        return redirect()->route('admin.career.index')->with('success', 'Article created.');
    }

    public function edit(CareerArticle $article): Response
    {
        return Inertia::render('Admin/Career/Edit', [
            'article' => $article,
            'categories' => CareerArticle::CATEGORIES,
        ]);
    }

    public function update(Request $request, CareerArticle $article): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:career_articles,slug,'.$article->id],
            'body' => ['required', 'string'],
            'category' => ['required', 'string', 'in:'.implode(',', CareerArticle::CATEGORIES)],
            'meta_description' => ['nullable', 'string', 'max:255'],
            'is_published' => ['boolean'],
        ]);

        $article->update($validated);

        return redirect()->route('admin.career.index')->with('success', 'Article updated.');
    }

    public function destroy(CareerArticle $article): RedirectResponse
    {
        $article->delete();

        return redirect()->route('admin.career.index')->with('success', 'Article deleted.');
    }
}
