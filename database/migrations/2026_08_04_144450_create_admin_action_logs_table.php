<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_action_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('actor_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('target_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('action', 64);
            $table->jsonb('meta')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['target_user_id', 'created_at']);
            $table->index(['actor_id', 'created_at']);
        });
    }

    public function down(): void
    {
        // Forward-only.
    }
};
