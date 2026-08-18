<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resumes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('full_name')->default('');
            $table->string('headline')->default('');
            $table->string('email')->default('');
            $table->string('location')->default('');
            $table->text('summary')->default('');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        // job_searches is created before this migration and re-attaches an FK
        // after the rebuild. Rolling this migration back (migrate:refresh/reset)
        // must drop that FK first or Postgres refuses to drop resumes.
        if (Schema::hasTable('job_searches') && Schema::hasColumn('job_searches', 'resume_id')) {
            if (Schema::getConnection()->getDriverName() === 'pgsql') {
                DB::statement('alter table job_searches drop constraint if exists job_searches_resume_id_foreign');
            } else {
                try {
                    Schema::table('job_searches', function (Blueprint $table): void {
                        $table->dropForeign(['resume_id']);
                    });
                } catch (Throwable) {
                    // Already gone.
                }
            }
        }

        Schema::dropIfExists('resumes');
    }
};
