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
        Schema::create('interview_notes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('job_application_id')
                ->constrained('job_applications')
                ->cascadeOnDelete();
            $table->text('body');
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('interview_notes');
    }
};
