<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The app is free — the prepaid-pricing-instrumentation experiment (job_pairings,
 * balance_transactions, ai_requests.job_pairing_id) is removed, not just turned off.
 * Empty down(): forward-only, matches drop_billing_tables_and_columns.
 *
 * Drop the FK only when it actually exists. Half-migrated DBs can have the
 * column without ai_requests_job_pairing_id_foreign; dropConstrainedForeignId()
 * always emits DROP CONSTRAINT for the conventional name and fails on Postgres.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('ai_requests') && Schema::hasColumn('ai_requests', 'job_pairing_id')) {
            $hasJobPairingForeign = false;

            foreach (Schema::getForeignKeys('ai_requests') as $foreignKey) {
                if (in_array('job_pairing_id', $foreignKey['columns'], true)) {
                    $hasJobPairingForeign = true;
                    break;
                }
            }

            // Drop by column list — SQLite cannot drop FKs by constraint name.
            // Only drop when the FK exists (half-migrated DBs may lack it).
            if ($hasJobPairingForeign) {
                Schema::table('ai_requests', function (Blueprint $table): void {
                    $table->dropForeign(['job_pairing_id']);
                });
            }

            Schema::table('ai_requests', function (Blueprint $table): void {
                $table->dropColumn('job_pairing_id');
            });
        }

        Schema::dropIfExists('balance_transactions');
        Schema::dropIfExists('job_pairings');
    }

    public function down(): void {}
};
