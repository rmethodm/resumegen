<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_searches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('resume_id')->nullable()->constrained()->nullOnDelete();
            $table->string('label', 120);
            $table->string('keywords', 200);
            $table->string('location', 120)->nullable();
            $table->string('scope', 16)->default('local'); // local | state | national
            $table->boolean('is_alerting')->default(false);
            $table->timestamp('last_run_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'is_alerting']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_searches');
    }
};
