<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    /**
     * Dead column, wired to nothing in app/ — added by the 2026-07-20 migration
     * alongside target_company, but never adopted by the relational rewrite.
     * Guarded with hasColumn() since some environments may already lack it.
     */
    public function up(): void
    {
        Schema::table('resumes', function (Blueprint $table) {
            if (Schema::hasColumn('resumes', 'target_title')) {
                $table->dropColumn('target_title');
            }
        });
    }

    public function down(): void
    {
        // Forward-only.
    }
};
