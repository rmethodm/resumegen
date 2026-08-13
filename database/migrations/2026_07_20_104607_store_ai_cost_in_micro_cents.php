<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * A gpt-4o-mini call costs ~0.05 cents, so an integer cents column recorded 0 for every
 * OpenAI request ever made — and ai:cost-alert, AiUsageReport, AdminStatsOverview and
 * AiUsersPage all read that zero. Store micro-cents (1 cent = 1,000,000) so the smallest
 * real call lands at ~46,500 instead of being rounded out of existence.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_requests', function (Blueprint $table): void {
            $table->unsignedBigInteger('estimated_cost_micro_cents')->default(0)->after('total_tokens');
        });

        // Every existing row is 0 — that is the bug — but backfill rather than assume it.
        DB::table('ai_requests')->update([
            'estimated_cost_micro_cents' => DB::raw('estimated_cost_cents * 1000000'),
        ]);

        Schema::table('ai_requests', function (Blueprint $table): void {
            $table->dropColumn('estimated_cost_cents');
        });
    }

    /**
     * Forward-only, per CLAUDE.md — a rollback would restore a column that can only
     * ever record zeros.
     */
    public function down(): void {}
};
