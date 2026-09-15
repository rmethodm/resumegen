<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreQaBankEntryRequest;
use App\Http\Requests\UpdateQaBankEntryRequest;
use App\Models\QaBankEntry;
use App\Services\AiCreditService;
use App\Services\AiService;
use App\Services\AiUsageLimiter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Throwable;

class QaBankEntryController extends Controller
{
    public function store(StoreQaBankEntryRequest $request): RedirectResponse
    {
        $profile = $request->user()->starterProfile()->firstOrCreate(
            ['user_id' => $request->user()->id],
        );

        $nextPosition = ((int) $profile->qaBankEntries()->max('position')) + 1;

        $profile->qaBankEntries()->create([
            ...$request->validated(),
            'position' => $nextPosition,
        ]);

        return back();
    }

    public function update(UpdateQaBankEntryRequest $request, QaBankEntry $entry): RedirectResponse
    {
        $entry->update($request->validated());

        return back();
    }

    public function destroy(Request $request, QaBankEntry $entry): RedirectResponse
    {
        abort_unless($entry->starterProfile->user_id === $request->user()->id, 404);

        $entry->delete();

        return back();
    }

    public function draft(Request $request, QaBankEntry $entry, AiService $ai, AiUsageLimiter $limiter, AiCreditService $credits): JsonResponse
    {
        $user = $request->user();

        abort_unless($entry->starterProfile->user_id === $user->id, 404);

        $cost = (int) config('ai.costs.qa_bank_draft');

        if ($status = $limiter->refusalStatus($user, $cost)) {
            $message = $status === 429 ? 'AI access is blocked.' : 'Subscription or AI credits required.';

            return response()->json(['message' => $message], $status);
        }

        try {
            $result = $ai->draftQaAnswer($user, $entry->question, $entry->starterProfile);
        } catch (Throwable $e) {
            report($e);

            return response()->json(['message' => 'AI draft failed.'], 500);
        }

        $credits->spend($user, $cost, 'qa_bank_draft', $result['ai_request_id']);

        // Never auto-saved: the draft is returned for the user to review and
        // explicitly accept (which then goes through the normal update route).
        return response()->json([
            'draft' => $result['text'],
            'credits_remaining' => $credits->balance($user),
        ]);
    }
}
