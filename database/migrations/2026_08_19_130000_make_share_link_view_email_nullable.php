<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Views are now logged for ungated links too (no email gate, so no email
     * to record) — /shares previously showed 0 views for those links.
     */
    public function up(): void
    {
        Schema::table('resume_share_link_views', function (Blueprint $table): void {
            $table->string('email')->nullable()->change();
        });
    }

    public function down(): void
    {
        // Forward-only, matching this project's migration policy.
    }
};
