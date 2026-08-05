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
        Schema::table('resume_share_link_views', function (Blueprint $table): void {
            $table->index('resume_share_link_id');
        });

        Schema::table('job_applications', function (Blueprint $table): void {
            $table->index('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('resume_share_link_views', function (Blueprint $table): void {
            $table->dropIndex(['resume_share_link_id']);
        });

        Schema::table('job_applications', function (Blueprint $table): void {
            $table->dropIndex(['user_id']);
        });
    }
};
