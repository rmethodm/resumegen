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
        Schema::create('scraped_jobs', function (Blueprint $table) {
            $table->id();
            $table->string('source');
            $table->string('external_id');
            $table->string('title');
            $table->string('company')->nullable();
            $table->string('location')->nullable();
            $table->string('url')->nullable();
            $table->string('salary')->nullable();
            $table->text('description')->nullable();
            $table->timestamp('posted_at')->nullable();
            $table->jsonb('raw')->nullable();
            $table->timestamps();

            // Re-scraping the same listing updates it in place instead of duplicating.
            $table->unique(['source', 'external_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('scraped_jobs');
    }
};
