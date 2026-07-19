<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_listings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_search_id')->constrained()->cascadeOnDelete();
            $table->string('source', 16); // adzuna | usajobs | url
            $table->string('external_id', 191);
            $table->string('title', 255);
            $table->string('company', 255)->nullable();
            $table->string('location', 255)->nullable();
            $table->string('url', 500)->nullable();
            $table->text('description')->nullable();
            $table->integer('salary_min')->nullable();
            $table->integer('salary_max')->nullable();
            $table->timestamp('posted_at')->nullable();
            $table->unsignedTinyInteger('fit_score')->nullable();
            $table->text('fit_reason')->nullable();
            $table->timestamp('notified_at')->nullable();
            $table->timestamps();

            // Makes "new since the last run" a database fact rather than a guess —
            // the alert digest depends on this to avoid re-mailing the same posting.
            $table->unique(['job_search_id', 'source', 'external_id']);
            $table->index(['job_search_id', 'notified_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_listings');
    }
};
