<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('portfolio_slug', 30)->nullable()->unique()->after('referral_rewards_earned');
            $table->string('portfolio_headline', 150)->nullable()->after('portfolio_slug');
            $table->text('portfolio_bio')->nullable()->after('portfolio_headline');
            $table->boolean('portfolio_is_public')->default(false)->after('portfolio_bio');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['portfolio_slug', 'portfolio_headline', 'portfolio_bio', 'portfolio_is_public']);
        });
    }
};
