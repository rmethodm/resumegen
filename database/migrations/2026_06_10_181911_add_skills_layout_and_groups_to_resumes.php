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
            $table->string('skills_layout')->default('inline')->after('skills');
            $table->json('skills_groups')->nullable()->after('skills_layout');
        });
    }

    public function down(): void
    {
        Schema::table('resumes', function (Blueprint $table): void {
            $table->dropColumn(['skills_layout', 'skills_groups']);
        });
    }
};
