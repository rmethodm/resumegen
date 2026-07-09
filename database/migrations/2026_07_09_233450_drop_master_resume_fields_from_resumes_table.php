<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The master-resume pattern was never built: no relation, controller, UI, or
 * test ever read these columns, and no row used them. Drop them rather than
 * leave a schema implying a feature exists.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resumes', function (Blueprint $table): void {
            $table->dropForeign(['master_resume_id']);
            $table->dropColumn(['master_resume_id', 'is_master', 'master_synced_at']);
        });
    }

    public function down(): void
    {
        Schema::table('resumes', function (Blueprint $table): void {
            $table->foreignId('master_resume_id')
                ->nullable()
                ->constrained('resumes')
                ->nullOnDelete()
                ->after('ab_parent_id');
            $table->boolean('is_master')->default(false)->after('master_resume_id');
            $table->timestamp('master_synced_at')->nullable()->after('is_master');
        });
    }
};
