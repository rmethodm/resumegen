<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Drop AI usage history, per-user AI caps, and job search/import products.
     * Job applications and resume autocomplete dictionaries stay.
     *
     * Forward-only: down() intentionally empty.
     */
    public function up(): void
    {
        Schema::dropIfExists('job_listings');
        Schema::dropIfExists('job_searches');
        Schema::dropIfExists('imported_jobs');
        Schema::dropIfExists('scraped_jobs');
        Schema::dropIfExists('ai_requests');

        Schema::table('users', function (Blueprint $table) {
            $columns = ['ai_limit_override', 'ai_blocked', 'ai_usage_reset_at'];
            $existing = array_values(array_filter(
                $columns,
                fn (string $column): bool => Schema::hasColumn('users', $column),
            ));

            if ($existing !== []) {
                $table->dropColumn($existing);
            }
        });
    }

    public function down(): void
    {
        //
    }
};
