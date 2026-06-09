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
        Schema::create('resume_thread_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('thread_id')->constrained('resume_threads')->cascadeOnDelete();
            $table->text('body');
            $table->boolean('is_owner')->default(false);
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resume_thread_messages');
    }
};
