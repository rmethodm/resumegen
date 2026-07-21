<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resumes', function (Blueprint $table): void {
            // Who the resume is aimed at. target_job_description already held the posting
            // text, but free text cannot identify a job — these two name it explicitly.
            $table->string('target_company')->nullable()->after('target_job_description');
            $table->string('target_title')->nullable()->after('target_company');
        });
    }

    public function down(): void
    {
        Schema::table('resumes', function (Blueprint $table): void {
            $table->dropColumn(['target_company', 'target_title']);
        });
    }
};
