<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Append-only ledger, matching the app's existing analytics-table convention.
        // Balance is SUM(amount_cents) — there is deliberately no cached column on users.
        Schema::create('balance_transactions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->integer('amount_cents');  // signed: +grant/+topup/+refund, -charge
            $table->string('reason');         // signup_grant | launch_grant | topup | charge | refund
            $table->foreignId('job_pairing_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('created_at')->nullable();

            $table->index(['user_id', 'id']);
        });

        // Idempotency for one-time grants, enforced by the database rather than a code check.
        // A re-run after a partial failure is the expected case, not an edge case, and this
        // is money. Covers signup_grant and launch_grant; top-ups and charges repeat freely.
        DB::statement(
            "CREATE UNIQUE INDEX balance_transactions_user_once_reason
             ON balance_transactions (user_id, reason)
             WHERE reason IN ('signup_grant', 'launch_grant')"
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('balance_transactions');
    }
};
