<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            // Guest accounts created from the builder subdomain's template
            // picker. The token is the credential: /w/{token} logs the guest
            // in. Null for every normal registered account.
            $table->string('guest_token', 60)->nullable()->unique();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('guest_token');
        });
    }
};
