<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Resizable sticky notes: the canvas card's footprint, in the same absolute
 * px space as x/y. Defaults match the fixed size the note had before it
 * became resizable, so existing notes render unchanged.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resume_notes', function (Blueprint $table): void {
            $table->integer('width')->default(224)->after('y');
            $table->integer('height')->default(140)->after('width');
        });
    }

    public function down(): void
    {
        Schema::table('resume_notes', function (Blueprint $table): void {
            $table->dropColumn(['width', 'height']);
        });
    }
};
