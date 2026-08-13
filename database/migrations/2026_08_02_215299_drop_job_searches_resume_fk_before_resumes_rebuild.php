<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * job_searches.resume_id references resumes, which the next migration drops
 * and rebuilds with a new schema. On a database where job_searches survived
 * (see recreate_ai_pricing_job_search_tables_if_missing), that live FK blocks
 * the drop. recreate_job_search_tables_if_missing re-adds the constraint
 * once resumes exists again.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('job_searches') && Schema::hasColumn('job_searches', 'resume_id')) {
            Schema::table('job_searches', function (Blueprint $table): void {
                $table->dropForeign(['resume_id']);
            });
        }
    }

    public function down(): void
    {
        // No-op: paired with the resumes rebuild this precedes.
    }
};
