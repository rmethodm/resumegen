<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('feature');
            $table->string('model');
            $table->unsignedInteger('prompt_tokens')->default(0);
            $table->unsignedInteger('completion_tokens')->default(0);
            $table->unsignedBigInteger('cost_micro_cents')->default(0);
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->unsignedInteger('ai_limit_override')->nullable();
            $table->boolean('ai_blocked')->default(false);
            $table->timestamp('ai_usage_reset_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_requests');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['ai_limit_override', 'ai_blocked', 'ai_usage_reset_at']);
        });
    }
};
