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
        Schema::table('admin_action_logs', function (Blueprint $table) {
            $table->dropForeign(['actor_id']);
            $table->dropForeign(['target_user_id']);
        });

        Schema::table('admin_action_logs', function (Blueprint $table) {
            $table->foreignId('actor_id')->nullable()->change();

            $table->foreign('actor_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('target_user_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Forward-only.
    }
};
