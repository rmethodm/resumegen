<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_requests', function (Blueprint $table) {
            $table->text('flagged_text')->nullable()->after('status');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->unsignedInteger('ai_limit_override')->nullable()->after('plan_tier');
            $table->boolean('ai_blocked')->default(false)->after('ai_limit_override');
            $table->timestamp('ai_usage_reset_at')->nullable()->after('ai_blocked');
        });
    }

    public function down(): void
    {
        Schema::table('ai_requests', function (Blueprint $table) {
            $table->dropColumn('flagged_text');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['ai_limit_override', 'ai_blocked', 'ai_usage_reset_at']);
        });
    }
};
