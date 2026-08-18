<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The app is free — the prepaid-pricing-instrumentation experiment (job_pairings,
 * balance_transactions, ai_requests.job_pairing_id) is removed, not just turned off.
 * Empty down(): forward-only, matches drop_billing_tables_and_columns.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('ai_requests') && Schema::hasColumn('ai_requests', 'job_pairing_id')) {
            Schema::table('ai_requests', function (Blueprint $table): void {
                $table->dropConstrainedForeignId('job_pairing_id');
            });
        }

        Schema::dropIfExists('balance_transactions');
        Schema::dropIfExists('job_pairings');
    }

    public function down(): void {}
};
