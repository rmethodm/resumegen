<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resume_share_links', function (Blueprint $table) {
            $table->boolean('is_primary')->default(false);
            $table->string('password_hash')->nullable();
            $table->timestamp('views_seen_at')->nullable();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('resume_share_links')) {
            return;
        }

        Schema::table('resume_share_links', function (Blueprint $table): void {
            foreach (['is_primary', 'password_hash', 'views_seen_at'] as $column) {
                if (Schema::hasColumn('resume_share_links', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
