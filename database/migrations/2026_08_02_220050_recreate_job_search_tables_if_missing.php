<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * See 2026_06_13_185959_recreate_ai_pricing_job_search_tables_if_missing —
 * same backfill, deferred until after the resumes table exists again since
 * job_searches.resume_id references it.
 */
return new class extends Migration
{
    public function up(): void
    {
        $jobSearchesExisted = Schema::hasTable('job_searches');

        if (! $jobSearchesExisted) {
            Schema::create('job_searches', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->foreignId('resume_id')->nullable()->constrained()->nullOnDelete();
                $table->string('label', 120);
                $table->string('keywords', 200);
                $table->string('location', 120)->nullable();
                $table->string('scope', 16)->default('local');
                $table->boolean('is_alerting')->default(false);
                $table->timestamp('last_run_at')->nullable();
                $table->timestamps();

                $table->index(['user_id', 'is_alerting']);
            });
        }

        // job_searches survived the resumes rebuild (the prior migration only
        // dropped its resume_id foreign key, not the column) — reattach it now
        // that resumes exists again with its new schema. A failed ALTER aborts
        // the rest of this migration's transaction on Postgres, so check via a
        // plain SELECT first rather than attempt-and-catch.
        if ($jobSearchesExisted
            && Schema::hasColumn('job_searches', 'resume_id')
            && DB::connection()->getDriverName() === 'pgsql') {
            $constraintExists = (bool) DB::selectOne(
                "select 1 from pg_constraint where conname = 'job_searches_resume_id_foreign'"
            );

            if (! $constraintExists) {
                Schema::table('job_searches', function (Blueprint $table): void {
                    $table->foreign('resume_id')->references('id')->on('resumes')->nullOnDelete();
                });
            }
        }

        if (! Schema::hasTable('job_listings')) {
            Schema::create('job_listings', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('job_search_id')->constrained()->cascadeOnDelete();
                $table->string('source', 16);
                $table->string('external_id', 191);
                $table->string('title', 255);
                $table->string('company', 255)->nullable();
                $table->string('location', 255)->nullable();
                $table->string('url', 500)->nullable();
                $table->text('description')->nullable();
                $table->integer('salary_min')->nullable();
                $table->integer('salary_max')->nullable();
                $table->timestamp('posted_at')->nullable();
                $table->unsignedTinyInteger('fit_score')->nullable();
                $table->text('fit_reason')->nullable();
                $table->timestamp('notified_at')->nullable();
                $table->timestamps();

                $table->unique(['job_search_id', 'source', 'external_id']);
                $table->index(['job_search_id', 'notified_at']);
            });
        }
    }

    public function down(): void
    {
        // No-op: this only backfills tables a since-removed migration dropped.
    }
};
