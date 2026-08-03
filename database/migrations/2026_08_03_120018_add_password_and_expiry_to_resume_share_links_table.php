<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resume_share_links', function (Blueprint $table): void {
            $table->boolean('require_password')->default(false)->after('require_email');
            $table->text('password')->nullable()->after('require_password');
            $table->timestamp('expires_at')->nullable()->after('password');
        });
    }

    public function down(): void
    {
        Schema::table('resume_share_links', function (Blueprint $table): void {
            $table->dropColumn(['require_password', 'password', 'expires_at']);
        });
    }
};
