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
        Schema::create('companies', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('source_id')->unique();
            $table->string('name')->nullable();
            $table->string('website')->nullable();
            $table->string('ats')->nullable();
            $table->string('slug')->nullable();
            $table->string('unique_id')->unique();
            $table->text('career_url')->nullable();
            $table->unsignedSmallInteger('founded_year')->nullable();
            $table->string('size')->nullable();
            $table->string('locality')->nullable();
            $table->string('region')->nullable();
            $table->string('country')->nullable();
            $table->string('industry')->nullable();
            $table->string('linkedin_url')->nullable();
            $table->string('linkedin_id')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('companies');
    }
};
