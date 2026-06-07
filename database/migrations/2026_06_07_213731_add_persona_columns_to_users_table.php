<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('target_role')->nullable()->after('profile');
            $table->string('industry')->nullable()->after('target_role');
            $table->unsignedTinyInteger('years_experience')->nullable()->after('industry');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['target_role', 'industry', 'years_experience']);
        });
    }
};
