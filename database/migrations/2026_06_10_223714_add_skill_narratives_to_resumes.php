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
        Schema::table('resumes', function (Blueprint $table): void {
            $table->json('skill_narratives')->nullable()->after('skills_groups');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('resumes') || ! Schema::hasColumn('resumes', 'skill_narratives')) {
            return;
        }

        Schema::table('resumes', function (Blueprint $table): void {
            $table->dropColumn('skill_narratives');
        });
    }
};
