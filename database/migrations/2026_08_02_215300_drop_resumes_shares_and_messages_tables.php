<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Defensive: also drop FKs that can outlive 215299 on a half-migrated DB.
        $this->dropResumeForeignIfExists('job_searches', 'job_searches_resume_id_foreign');
        $this->dropResumeForeignIfExists('job_applications', 'job_applications_resume_id_foreign');

        if (Schema::hasTable('job_applications') && Schema::hasColumn('job_applications', 'resume_id')) {
            Schema::table('job_applications', function (Blueprint $table): void {
                $table->dropColumn('resume_id');
            });
        }

        Schema::dropIfExists('resume_thread_messages');
        Schema::dropIfExists('resume_threads');
        Schema::dropIfExists('resume_share_events');
        Schema::dropIfExists('resume_notes');
        Schema::dropIfExists('resume_section_events');
        Schema::dropIfExists('resume_tags');
        Schema::dropIfExists('resume_share_links');
        Schema::dropIfExists('resumes');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }

    private function dropResumeForeignIfExists(string $table, string $constraint): void
    {
        if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'resume_id')) {
            return;
        }

        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement('alter table '.$table.' drop constraint if exists '.$constraint);

            return;
        }

        try {
            Schema::table($table, function (Blueprint $blueprint): void {
                $blueprint->dropForeign(['resume_id']);
            });
        } catch (Throwable) {
            // Constraint already gone (SQLite / re-run).
        }
    }
};
