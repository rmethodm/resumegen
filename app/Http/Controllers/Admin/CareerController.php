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

        if (isset($validated['body'])) {
            $validated['body'] = CareerArticle::sanitizeBody($validated['body']);
        }

        CareerArticle::create($validated);

        return redirect()->route('admin.career.index')->with('success', 'Article created.');
    }

    public function edit(CareerArticle $career): Response
    {
        return Inertia::render('Admin/Career/Edit', [
            'article' => $career,
            'categories' => CareerArticle::CATEGORIES,
        ]);
    }

    public function update(Request $request, CareerArticle $career): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', 'unique:career_articles,slug,'.$career->id],
            'body' => ['required', 'string'],
            'category' => ['required', 'string', 'in:'.implode(',', CareerArticle::CATEGORIES)],
            'meta_description' => ['nullable', 'string', 'max:255'],
            'is_published' => ['boolean'],
        ]);

        if (isset($validated['body'])) {
            $validated['body'] = CareerArticle::sanitizeBody($validated['body']);
        }

        $career->update($validated);

        return redirect()->route('admin.career.index')->with('success', 'Article updated.');
    }

    public function destroy(CareerArticle $career): RedirectResponse
    {
        $career->delete();

        return redirect()->route('admin.career.index')->with('success', 'Article deleted.');
    }
}
