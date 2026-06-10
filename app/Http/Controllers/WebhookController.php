<?php

namespace App\Http\Controllers;

use App\Models\WebhookEndpoint;
use App\Rules\PublicUrl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class WebhookController extends Controller
{
    private const VALID_EVENTS = [
        'resume.created',
        'resume.updated',
        'job_application.created',
        'job_application.updated',
    ];

    public function index(Request $request): InertiaResponse
    {
        $canWebhooks = $request->user()->isAtLeastStarter();

        return Inertia::render('Webhooks/Index', [
            'endpoints' => $request->user()->webhookEndpoints()->get(),
            'canWebhooks' => $canWebhooks,
            'validEvents' => self::VALID_EVENTS,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        if (! $request->user()->isAtLeastStarter()) {
            return response()->json(['error' => 'Starter plan required.', 'required_tier' => 'starter'], 402);
        }

        $validated = $request->validate([
            'url' => ['required', 'url', 'max:500', new PublicUrl],
            'events' => ['required', 'array', 'min:1'],
            'events.*' => ['required', 'string', 'in:'.implode(',', self::VALID_EVENTS)],
        ]);

        $endpoint = $request->user()->webhookEndpoints()->create($validated);

        return response()->json($endpoint, 201);
    }

    public function destroy(Request $request, WebhookEndpoint $endpoint): Response
    {
        if ($endpoint->user_id !== $request->user()->id) {
            abort(403);
        }

        $endpoint->delete();

        return response()->noContent();
    }
}
