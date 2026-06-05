<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('plan_tier')->default('free')->after('is_pro');
        });

        // Backfill: existing is_pro users → 'pro'
        DB::table('users')->where('is_pro', true)->update(['plan_tier' => 'pro']);

        // Backfill: users with active/trialing Cashier subscriptions → 'pro'
        $subscribedIds = DB::table('subscriptions')
            ->whereIn('stripe_status', ['active', 'trialing'])
            ->pluck('user_id');

        if ($subscribedIds->isNotEmpty()) {
            DB::table('users')->whereIn('id', $subscribedIds)->update(['plan_tier' => 'pro']);
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('plan_tier');
        });
    }
};
