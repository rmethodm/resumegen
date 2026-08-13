<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * See 2026_06_13_185959_recreate_ai_pricing_job_search_tables_if_missing —
 * same backfill for job_pairings, balance_transactions, and the
 * ai_requests.job_pairing_id column, positioned after their own create/alter
 * migrations so a fresh install's unguarded originals build them first and
 * every check below is a no-op.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('job_pairings')) {
            Schema::create('job_pairings', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('billing_key');
                $table->string('company')->nullable();
                $table->string('title')->nullable();
                $table->unsignedInteger('price_cents')->default(0);
                $table->timestamp('refunded_at')->nullable();
                $table->timestamps();
            });

            DB::statement(
                'CREATE UNIQUE INDEX job_pairings_user_billing_key_live
                 ON job_pairings (user_id, billing_key) WHERE refunded_at IS NULL'
            );
        }

        if (! Schema::hasTable('balance_transactions')) {
            Schema::create('balance_transactions', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->integer('amount_cents');
                $table->string('reason');
                $table->foreignId('job_pairing_id')->nullable()->constrained()->nullOnDelete();
                $table->timestamp('created_at')->nullable();

                $table->index(['user_id', 'id']);
            });

            DB::statement(
                "CREATE UNIQUE INDEX balance_transactions_user_once_reason
                 ON balance_transactions (user_id, reason)
                 WHERE reason IN ('signup_grant', 'launch_grant')"
            );
        }

        if (Schema::hasTable('ai_requests') && ! Schema::hasColumn('ai_requests', 'job_pairing_id')) {
            Schema::table('ai_requests', function (Blueprint $table): void {
                $table->foreignId('job_pairing_id')->nullable()->after('user_id')->constrained()->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        // No-op: this only backfills tables/columns a since-removed migration dropped.
    }
};
