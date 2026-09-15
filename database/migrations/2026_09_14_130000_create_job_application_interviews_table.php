<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_application_interviews', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('job_application_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('round');
            $table->dateTime('scheduled_at')->nullable();
            $table->string('type')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['job_application_id', 'round']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_application_interviews');
    }
};
