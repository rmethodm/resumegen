<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AiModelRate;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminAiRateController extends Controller
{
    public function index(): Response
    {
        $history = AiModelRate::latest('effective_from')->paginate(30);

        $current = AiModelRate::select('provider', 'model', 'input_cost_per_million', 'output_cost_per_million', 'effective_from')
            ->whereIn('id', function ($sub) {
                $sub->selectRaw('MAX(id)')
                    ->from('ai_model_rates')
                    ->groupBy('provider', 'model');
            })
            ->orderBy('provider')
            ->orderBy('model')
            ->get();

        return Inertia::render('Admin/AiRates/Index', [
            'history' => $history,
            'current' => $current,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'provider' => ['required', 'string', 'max:50'],
            'model' => ['required', 'string', 'max:100'],
            'input_cost_per_million' => ['required', 'numeric', 'min:0'],
            'output_cost_per_million' => ['required', 'numeric', 'min:0'],
            'effective_from' => ['required', 'date', 'after_or_equal:today'],
        ]);

        AiModelRate::create($request->only([
            'provider', 'model', 'input_cost_per_million', 'output_cost_per_million', 'effective_from',
        ]));

        return back()->with('success', 'Rate added successfully.');
    }
}
