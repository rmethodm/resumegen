<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('experiences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resume_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('position')->default(0);
            $table->string('title')->default('');
            $table->string('company')->default('');
            // Free text, not dates: resumes say "2022 – Present", not 2022-01-01.
            $table->string('period')->default('');
            // ponytail: bullets are an ordered string list owned entirely by one
            // experience and never queried on their own. JSON column instead of a
            // fourth table; promote it if bullets ever need their own identity.
            $table->json('bullets')->default('[]');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('experiences');
    }
};
