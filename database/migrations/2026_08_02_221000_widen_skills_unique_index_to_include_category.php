<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Skills gained a category, so a name is only a duplicate within one.
     * "CBT" under both Core and Adjacent is two legitimate rows, and the old
     * (resume_id, name) index rejected the second.
     */
    public function up(): void
    {
        Schema::table('skills', function (Blueprint $table) {
            $table->dropUnique(['resume_id', 'name']);
            $table->unique(['resume_id', 'category', 'name']);
        });
    }

    public function down(): void
    {
        Schema::table('skills', function (Blueprint $table) {
            $table->dropUnique(['resume_id', 'category', 'name']);
            $table->unique(['resume_id', 'name']);
        });
    }
};
