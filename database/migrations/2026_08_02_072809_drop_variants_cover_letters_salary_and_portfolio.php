<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A/B resume variants, Cover Letters, the salary hint, and Portfolio (including its
 * contact-form messages) are all removed. Irreversible by design — migrations in
 * this project are forward-only.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('resumes', 'ab_parent_id')) {
            Schema::table('resumes', function (Blueprint $table) {
                $table->dropConstrainedForeignId('ab_parent_id');
            });
        }

        Schema::dropIfExists('cover_letters');
        Schema::dropIfExists('portfolio_messages');

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'portfolio_slug')) {
                $table->dropUnique(['portfolio_slug']);
            }

            foreach (['portfolio_slug', 'portfolio_headline', 'portfolio_bio', 'portfolio_is_public', 'portfolio_links'] as $column) {
                if (Schema::hasColumn('users', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }

    public function down(): void
    {
        // No-op: the removed code is gone, so restoring the schema would restore
        // nothing usable.
    }
};
