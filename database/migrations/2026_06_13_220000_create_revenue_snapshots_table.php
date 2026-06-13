<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('revenue_snapshots', function (Blueprint $table): void {
            $table->id();
            $table->date('captured_on')->unique();
            $table->unsignedBigInteger('mrr_cents');
            $table->unsignedInteger('paying_users');
            $table->unsignedInteger('free_users');
            $table->unsignedInteger('active_subscriptions');
            $table->json('tier_counts')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('revenue_snapshots');
    }
};
