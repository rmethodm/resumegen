<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('admin_action_logs', function (Blueprint $table) {
            $table->dropForeign(['target_user_id']);
        });

        Schema::table('admin_action_logs', function (Blueprint $table) {
            $table->foreignId('target_user_id')->nullable()->change();
            $table->foreign('target_user_id')
                ->references('id')
                ->on('users')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        // Forward-only.
    }
};
