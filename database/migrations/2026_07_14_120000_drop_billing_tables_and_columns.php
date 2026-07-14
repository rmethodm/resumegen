<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Billing is removed from the app: Cashier is uninstalled, there are no plan tiers,
 * and every feature is free. This drops the subscription tables and the Stripe/tier
 * columns they hung off. Irreversible by design — `down()` would recreate empty
 * tables with no data and no code to read them.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('subscription_items');
        Schema::dropIfExists('subscriptions');

        // The stripe_id index must go before its column — SQLite refuses to drop a column
        // that a live index still points at.
        if (Schema::hasColumn('users', 'stripe_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropIndex('users_stripe_id_index');
            });
        }

        Schema::table('users', function (Blueprint $table) {
            foreach (['stripe_id', 'pm_type', 'pm_last_four', 'trial_ends_at', 'plan_tier', 'is_pro'] as $column) {
                if (Schema::hasColumn('users', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }

    public function down(): void
    {
        // No-op: the billing code is gone, so restoring the schema would restore nothing usable.
    }
};
