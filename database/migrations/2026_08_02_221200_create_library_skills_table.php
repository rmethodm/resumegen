<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The catalogue a user picks from, distinct from `skills`, which holds the
 * ones actually on a resume. Reference data owned by the seeder, so it carries
 * no timestamps and no user column.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('library_skills', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('category');
            $table->string('kind');
            $table->unsignedSmallInteger('position');

            // A name is only unique within its category — "writing" is a
            // Language skill and "written communication" a Communication one,
            // and neighbouring categories can legitimately overlap.
            $table->unique(['category', 'name']);
            $table->index('kind');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('library_skills');
    }
};
