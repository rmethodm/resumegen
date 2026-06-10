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
        Schema::dropIfExists('ai_usage_logs');
        Schema::dropIfExists('ai_model_rates');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Intentionally not recreated — AI features were removed
    }
};
