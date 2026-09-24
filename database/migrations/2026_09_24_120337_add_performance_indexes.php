<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Indexes for hot lookups found in the 2026-09-24 audit. PostgreSQL does not
 * index foreign key columns on its own, so the FK lookups below were scans.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_application_status_events', function (Blueprint $table): void {
            $table->index(['job_application_id', 'created_at']);
        });

        Schema::table('job_applications', function (Blueprint $table): void {
            $table->index('resume_id');
        });

        Schema::table('job_pool_entries', function (Blueprint $table): void {
            $table->index('resume_id');
            $table->index('job_listing_id');
        });

        Schema::table('qa_bank_entries', function (Blueprint $table): void {
            $table->index(['starter_profile_id', 'position']);
        });

        Schema::table('ai_credit_ledger', function (Blueprint $table): void {
            $table->index('ai_request_id');
        });

        // The scheduled 90-day prune filters on deleted_at alone.
        Schema::table('resume_deletions', function (Blueprint $table): void {
            $table->index('deleted_at');
        });

        Schema::table('resumes', function (Blueprint $table): void {
            $table->index(['user_id', 'updated_at']);
        });
    }

    public function down(): void
    {
        Schema::table('job_application_status_events', fn (Blueprint $table) => $table->dropIndex(['job_application_id', 'created_at']));
        Schema::table('job_applications', fn (Blueprint $table) => $table->dropIndex(['resume_id']));
        Schema::table('job_pool_entries', function (Blueprint $table): void {
            $table->dropIndex(['resume_id']);
            $table->dropIndex(['job_listing_id']);
        });
        Schema::table('qa_bank_entries', fn (Blueprint $table) => $table->dropIndex(['starter_profile_id', 'position']));
        Schema::table('ai_credit_ledger', fn (Blueprint $table) => $table->dropIndex(['ai_request_id']));
        Schema::table('resume_deletions', fn (Blueprint $table) => $table->dropIndex(['deleted_at']));
        Schema::table('resumes', fn (Blueprint $table) => $table->dropIndex(['user_id', 'updated_at']));
    }
};
