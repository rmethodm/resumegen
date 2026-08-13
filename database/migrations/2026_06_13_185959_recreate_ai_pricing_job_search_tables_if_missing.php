<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A since-removed migration dropped ai_requests on any database that had
 * already run its create migration. That create migration is marked "Ran"
 * in the migrations table and won't fire again, so on a database that went
 * through the drop, the table stays missing forever without this. No-op on
 * a fresh database — the create migration already built it.
 *
 * Bare schema only (no job_pairing_id) — job_pairings doesn't exist yet at
 * this point in a fresh install. See recreate_job_pairing_tables_if_missing
 * for that column and the job_pairings/balance_transactions tables, deferred
 * until after their own create migrations run.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('ai_requests')) {
            Schema::create('ai_requests', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
                $table->string('feature')->nullable();
                $table->string('model');
                $table->unsignedInteger('prompt_tokens')->default(0);
                $table->unsignedInteger('completion_tokens')->default(0);
                $table->unsignedInteger('total_tokens')->default(0);
                $table->unsignedInteger('estimated_cost_cents')->default(0);
                $table->string('status')->default('success');
                $table->timestamp('created_at')->nullable();

                $table->index(['user_id', 'created_at']);
            });
        }
    }

    public function down(): void
    {
        // No-op: this only backfills a table a since-removed migration dropped.
    }
};
