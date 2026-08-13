<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resumes', function (Blueprint $table) {
            $table->foreignId('job_application_id')
                ->nullable()
                ->after('master_synced_at')
                ->constrained('job_applications')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('resumes') || ! Schema::hasColumn('resumes', 'job_application_id')) {
            return;
        }

        Schema::table('resumes', function (Blueprint $table) {
            $table->dropConstrainedForeignId('job_application_id');
        });
    }
};
