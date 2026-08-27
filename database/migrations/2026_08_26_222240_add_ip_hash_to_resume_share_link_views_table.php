<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Keyed HMAC-style hash of the viewer IP so cookieless clients can be
     * deduped per day without storing raw IPs in an append-only table.
     */
    public function up(): void
    {
        Schema::table('resume_share_link_views', function (Blueprint $table): void {
            $table->string('ip_hash', 64)->nullable()->after('email');
            $table->index(['resume_share_link_id', 'ip_hash', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('resume_share_link_views', function (Blueprint $table): void {
            $table->dropIndex(['resume_share_link_id', 'ip_hash', 'created_at']);
            $table->dropColumn('ip_hash');
        });
    }
};
