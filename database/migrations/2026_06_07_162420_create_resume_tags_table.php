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
        Schema::create('resume_tags', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('resume_id')
                ->constrained('resumes')
                ->cascadeOnDelete();
            $table->string('label', 30);
            $table->char('color', 7)->default('#6366f1');
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('resume_tags');
    }
};
