<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Optional job-posting notes for the "tailor this version" workflow.
     * Not printed on the resume — used for context / future keyword tools.
     */
    public function up(): void
    {
        Schema::table('resumes', function (Blueprint $table) {
            if (! Schema::hasColumn('resumes', 'target_job_description')) {
                $table->text('target_job_description')->nullable()->after('target_company');
            }
        });
    }

    public function down(): void
    {
        // Forward-only project — down is intentionally empty.
    }
};
