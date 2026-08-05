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
        Schema::create('imported_jobs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('source');
            $table->string('external_id');
            $table->string('title');
            $table->string('company')->nullable();
            $table->string('location')->nullable();
            $table->string('url')->nullable();
            $table->string('salary')->nullable();
            $table->text('description')->nullable();
            $table->timestamp('posted_at')->nullable();
            $table->string('status')->default('Saved');
            $table->jsonb('raw')->nullable();
            $table->timestamps();

            // Prevents importing the same listing twice for the same user.
            $table->unique(['user_id', 'source', 'external_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('imported_jobs');
    }
};
