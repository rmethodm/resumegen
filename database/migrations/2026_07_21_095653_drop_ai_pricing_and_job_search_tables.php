<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * AI, the prepaid-pricing instrumentation, and Job Search are removed from the app.
 * Their create-migrations were deleted, so fresh databases never build these tables;
 * this drops them for databases that already ran those migrations, letting both
 * converge. Irreversible by design — `down()` would recreate empty tables with no
 * data and no code to read them.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ai_requests first: its job_pairing_id FK points at job_pairings, and Postgres
        // refuses to drop a table a live foreign key still references.
        Schema::dropIfExists('ai_requests');
        Schema::dropIfExists('balance_transactions');
        Schema::dropIfExists('job_pairings');

        // job_listings before job_searches — same FK ordering reason.
        Schema::dropIfExists('job_listings');
        Schema::dropIfExists('job_searches');

        Schema::table('users', function (Blueprint $table) {
            foreach (['ai_limit_override', 'ai_blocked', 'ai_usage_reset_at'] as $column) {
                if (Schema::hasColumn('users', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }

    public function down(): void
    {
        // No-op: the AI, pricing, and Job Search code is gone, so restoring the schema
        // would restore nothing usable. Migrations in this project are forward-only.
    }
};
