<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminActionLog;
use App\Support\AdminDestructiveGate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class DatabaseQueryController extends Controller
{
    private const READ_ONLY_KEYWORDS = ['SELECT', 'EXPLAIN', 'WITH'];

    public function index(): Response
    {
        $actor = request()->user();

        $history = AdminActionLog::query()
            ->where('actor_id', $actor?->id)
            ->where('action', 'like', 'database.query%')
            ->latest('created_at')
            ->limit(50)
            ->get(['action', 'meta', 'created_at']);

        return Inertia::render('Admin/Database/Query/Index', [
            'history' => $history,
        ]);
    }

    public function run(Request $request): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'sql' => ['required', 'string'],
            'confirm' => ['nullable', 'string'],
        ]);

        $sql = trim($validated['sql']);
        $keyword = strtoupper(strtok($sql, " \t\n") ?: '');

        abort_if(
            str_contains(rtrim($sql, "; \t\n"), ';'),
            422,
            'Run one statement at a time.'
        );

        $readOnly = in_array($keyword, self::READ_ONLY_KEYWORDS, true);

        if (! $readOnly) {
            $deny = AdminDestructiveGate::denyResponse($request);
            if ($deny !== null) {
                return $deny;
            }

            $target = $this->extractTargetIdentifier($sql);

            abort_unless(
                $target !== null && ($validated['confirm'] ?? null) === $target,
                422,
                'Type the exact table/role name affected by this statement to confirm.'
            );
        }

        $rowsAffected = null;
        $rows = null;

        try {
            DB::beginTransaction();

            if ($readOnly) {
                // First-keyword classification is a heuristic: WITH can hide
                // data-modifying CTEs and EXPLAIN ANALYZE executes the statement.
                // A READ ONLY transaction makes Postgres itself reject any write.
                if (DB::getDriverName() === 'pgsql') {
                    DB::statement('SET TRANSACTION READ ONLY');
                }

                $rows = DB::select($sql);
            } else {
                $rowsAffected = DB::affectingStatement($sql);
            }

            DB::commit();
        } catch (Throwable $e) {
            DB::rollBack();

            $this->record($request, 'database.query.failed', [
                'sql' => $sql,
                'error' => $e->getMessage(),
            ]);

            return response()->json(['message' => $e->getMessage()], 422);
        }

        $this->record($request, 'database.query.'.strtolower($keyword), [
            'sql' => $sql,
            'rows_affected' => $rowsAffected,
        ]);

        return response()->json([
            'rows' => $rows,
            'rows_affected' => $rowsAffected,
        ]);
    }

    public function explain(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'sql' => ['required', 'string'],
        ]);

        try {
            // READ ONLY transaction: input like "(analyze) DELETE ..." would
            // otherwise execute the statement via EXPLAIN ANALYZE.
            $plan = DB::transaction(function () use ($validated) {
                if (DB::getDriverName() === 'pgsql') {
                    DB::statement('SET TRANSACTION READ ONLY');
                }

                return DB::select('explain '.trim($validated['sql']));
            });
        } catch (Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['plan' => $plan]);
    }

    private function extractTargetIdentifier(string $sql): ?string
    {
        if (preg_match(
            '/\b(?:table|from|into|role|user|to)\s+(?:if\s+exists\s+)?"?([a-zA-Z_][a-zA-Z0-9_]*)"?/i',
            $sql,
            $matches
        )) {
            return $matches[1];
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $meta
     */
    private function record(Request $request, string $action, array $meta): void
    {
        $actor = $request->user();
        if ($actor === null) {
            return;
        }

        AdminActionLog::record($actor, null, $action, $meta);
    }
}
