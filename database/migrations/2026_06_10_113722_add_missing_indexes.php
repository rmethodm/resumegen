<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('resume_section_events', function (Blueprint $table): void {
            $table->index(['resume_id', 'section'], 'rse_resume_section_idx');
            $table->index('resume_id', 'rse_resume_idx');
        });

        Schema::table('resume_threads', function (Blueprint $table): void {
            $table->index(['resume_id', 'is_read'], 'rt_resume_read_idx');
            $table->index('created_at', 'rt_created_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('resume_section_events', function (Blueprint $table): void {
            $table->dropIndex('rse_resume_section_idx');
            $table->dropIndex('rse_resume_idx');
        });

        Schema::table('resume_threads', function (Blueprint $table): void {
            $table->dropIndex('rt_resume_read_idx');
            $table->dropIndex('rt_created_idx');
        });
    }
};
