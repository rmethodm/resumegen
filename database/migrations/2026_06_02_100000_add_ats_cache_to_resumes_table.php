<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resumes', function (Blueprint $table) {
            $table->json('ats_cache')->nullable()->after('certifications');
            $table->timestamp('ats_cached_at')->nullable()->after('ats_cache');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('resumes')) {
            return;
        }

        Schema::table('resumes', function (Blueprint $table) {
            foreach (['ats_cache', 'ats_cached_at'] as $column) {
                if (Schema::hasColumn('resumes', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
