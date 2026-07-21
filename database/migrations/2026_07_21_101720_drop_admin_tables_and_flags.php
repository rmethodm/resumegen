<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The admin panel, the Career Hub it was the only editor for, and the outbound-mail
 * log only it could read are all removed. Their create-migrations were deleted, so
 * fresh databases never build these tables; this drops them for databases that
 * already ran those migrations. Irreversible by design — migrations in this project
 * are forward-only.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('admin_audit_logs');
        Schema::dropIfExists('system_events');
        Schema::dropIfExists('career_articles');

        // is_master_admin gated panel access and nothing else. Its create-migration
        // also added is_pro, which the 2026-07-14 billing drop already removed, so
        // that file stays put and only this column goes.
        if (Schema::hasColumn('users', 'is_master_admin')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('is_master_admin');
            });
        }
    }

    public function down(): void
    {
        // No-op: the admin code is gone, so restoring the schema would restore
        // nothing usable.
    }
};
